import { getNarrative } from "@/core/generators/narratives";
import { type Player, type StaffMember } from "@/core/db/db";
import { NewsService } from "@/news/service/news-service";
import { clamp } from "@/core/utils/math";
import { TACTIC_DEFINITIONS } from "./core/tactics";
import type { NewsArticle, TeamRatings } from "./core/types";

const ratingsCache = new Map<
	string,
	{ ratings: TeamRatings; timestamp: number }
>();

function getCacheKey(starters: Player[], tactic: string, strategy: string, tacticalSkill: number, pressure: number, coachConfidence: number): string {
	const ids = starters.map((p) => p.id).sort().join(",");
	return `${ids}-${tactic}-${strategy}-${tacticalSkill}-${pressure}-${coachConfidence}`;
}

function calculateAverageStat(starters: Player[], statKey: keyof Player["stats"]): number {
	return starters.reduce((acc, p) => acc + (p.stats[statKey] || 0), 0) / starters.length;
}

/**
 * Calcule le multiplicateur de fidélité (Loyalty) d'un joueur.
 * Bonus de +2% tous les 100 jours au club, plafonné à +20%.
 * Malus si le joueur est sur la liste des transferts.
 */
function getLoyaltyMultiplier(player: Player, currentDay: number, currentSeason: number): number {
    if (player.isTransferListed) return 0.90; // Malus de 10% si sur la liste des transferts

    const joinedSeason = player.joinedSeason || 1;
    const joinedDay = player.joinedDay || 1;

    const totalDaysAtClub = (currentSeason - joinedSeason) * 365 + (currentDay - joinedDay);
    const loyaltyPoints = Math.floor(totalDaysAtClub / 100);
    const bonus = Math.min(0.20, loyaltyPoints * 0.02);
    return 1.0 + bonus;
}

/**
 * Calcule le multiplicateur de confiance (Confidence) d'un joueur.
 * Bonus/Malus basé sur la confiance (0-100, neutre à 50).
 * Les joueurs expérimentés sont moins sensibles aux variations de confiance.
 */
function getConfidenceMultiplier(player: Player): number {
	const confidence = player.confidence ?? 50;
    const experience = player.experience || 1;
    const experienceFactor = Math.max(0.5, 1.1 - (experience / 10)); 
	const bonus = ((confidence - 50) / 500) * experienceFactor; 
	return 1.0 + bonus;
}

/**
 * Calcule l'impact de la pression du match sur le joueur.
 * Les joueurs avec le trait BIG_MATCH_PLAYER brillent.
 * Les joueurs avec le trait GHOST_PLAYER s'effondrent.
 * Les vétérans gèrent mieux la pression que les jeunes.
 */
function getPressureMultiplier(player: Player, matchPressure: number): number {
    if (matchPressure <= 20) return 1.0; // Pression négligeable

    const normalizedPressure = matchPressure / 100;
    let impact = 0;

    // Trait Big Match Player: Bonus jusqu'à +15%
    if (player.traits && player.traits.includes("BIG_MATCH_PLAYER")) {
        impact += 0.15 * normalizedPressure;
    }
    // Trait Ghost Player: Malus jusqu'à -20%
    if (player.traits && player.traits.includes("GHOST_PLAYER")) {
        impact -= 0.20 * normalizedPressure;
    }

    // Impact de l'expérience: Un jeune (exp 1) peut perdre jusqu'à 10% par stress, 
    // un vétéran (exp 10) est insensible ou gagne légèrement en focus.
    const experience = player.experience || 1;
    const experienceFocus = (experience - 5) / 50; // -0.08 à +0.10
    impact += experienceFocus * normalizedPressure;

    return 1.0 + impact;
}

/**
 * Calcule l'impact du coach sur les notes de l'équipe.
 * Un coach en confiance booste ses joueurs.
 * Un coach sous pression transmet son stress s'il manque d'expérience.
 * Prise en compte de la familiarité tactique et des traits.
 */
function calculateCoachImpact(
    coach: StaffMember | undefined, 
    matchPressure: number, 
    currentDay: number, 
    currentSeason: number
): number {
    if (!coach) return 1.0;

    const confidence = coach.confidence || 50;
    let impact = 1.0;

    // 1. Confiance de base (-5% à +5%)
    impact += (confidence - 50) / 1000;

    // 2. Stress du match
    const pressureStress = (matchPressure / 100) * (50 - confidence) / 500;
    impact += pressureStress;

    // 3. Familiarité Tactique (Vécut au club)
    // Bonus de +1% tous les 100 jours, plafonné à +10%
    const totalDaysAtClub = (currentSeason - (coach.joinedSeason || 1)) * 365 + (currentDay - (coach.joinedDay || 1));
    const familiarityBonus = Math.min(0.10, Math.floor(totalDaysAtClub / 100) * 0.01);
    impact += familiarityBonus;

    // 4. Traits du Coach
    if (coach.traits && coach.traits.includes("TACTICIAN")) {
        impact += 0.05; // Bonus permanent à l'organisation
    }
    if (coach.traits && coach.traits.includes("STRATEGIST") && matchPressure > 50) {
        impact += 0.05; // Bonus spécifique aux gros matchs
    }

    return impact;
}

function calculateSector(
	starters: Player[],
	statWeights: Partial<Record<keyof Player["stats"], number>>,
	posWeights: Record<Player["position"], number>,
	targetSide: "L" | "C" | "R" | "ALL",
    currentDay: number,
    currentSeason: number,
    matchPressure: number,
    coachImpact: number,
	bonus = 1.0,
): number {
	return (
		starters.reduce((acc, p) => {
			const formMultiplier = 0.6 + (p.form || 5) / 10;
            const loyaltyMultiplier = getLoyaltyMultiplier(p, currentDay, currentSeason);
			const confidenceMultiplier = getConfidenceMultiplier(p);
            const pressureMultiplier = getPressureMultiplier(p, matchPressure);
			
			let statContribution = 0;
			let totalWeight = 0;
			for (const [stat, weight] of Object.entries(statWeights)) {
                // Safely access stats
				statContribution += (p.stats[stat as keyof Player["stats"]] || 0) * weight!;
				totalWeight += weight!;
			}
			const avgStat = totalWeight > 0 ? statContribution / totalWeight : p.skill;

            // Ensure condition is valid (default to 100 if missing to avoid NaN, but 90 for realism if old save)
            // If condition is missing, assume player is fit.
            const condition = (p.condition !== undefined) ? p.condition : 100;

			const contribution = avgStat * (posWeights[p.position] || 0) * (condition / 100) * formMultiplier * loyaltyMultiplier * confidenceMultiplier * pressureMultiplier * coachImpact;

			let sideFactor = 1.0;
			const pSide = p.side || "C";
			if (targetSide !== "ALL") {
				if (pSide === targetSide) sideFactor = 1.0;
				else if (targetSide === "C") sideFactor = p.position === "FWD" ? 0.90 : 0.75;
				else if (pSide === "C") sideFactor = 0.15;
				else sideFactor = 0.10;
			}

			return acc + contribution * sideFactor;
		}, 0) * bonus
	);
}

export function calculateTeamRatings(
	players: Player[],
	tactic: TeamRatings["tacticType"] = "NORMAL",
	strategy: TeamRatings["strategy"] = "BALANCED",
	saveId?: number,
    currentDay = 1,
    currentSeason = 1,
	tacticalSkill = 10.0,
	coachPreferredStrategy: TeamRatings["strategy"] = "BALANCED",
    matchPressure = 0,
    coach?: StaffMember,
): TeamRatings {
	let starters = players.filter((p) => p.isStarter);
	if (starters.length < 11) {
		const remainingCount = 11 - starters.length;
		const availablePlayers = players.filter((p) => !p.isStarter);
		const bestAvailable = [...availablePlayers].sort((a, b) => b.skill - a.skill);
		starters = [...starters, ...bestAvailable.slice(0, remainingCount)];
	}

    const coachConfidence = coach?.confidence || 50;
	const cacheKey = getCacheKey(starters, tactic, strategy, tacticalSkill, matchPressure, coachConfidence);
	const cached = ratingsCache.get(cacheKey);
	if (cached && Date.now() - cached.timestamp < 60000) return cached.ratings;

    const coachImpact = calculateCoachImpact(coach, matchPressure, currentDay, currentSeason);

	const hasGK = starters.some((p) => p.position === "GK");
	const gkBonus = hasGK ? 1.0 : 0.2;

	const DIVIDER = 0.7;

	const baseRatings: TeamRatings = {
		midfield: calculateSector(starters, { resistance: 1, volume: 1, vision: 0.5 }, { GK: 0, DEF: 0.2, MID: 1.0, FWD: 0.1 }, "ALL", currentDay, currentSeason, matchPressure, coachImpact) / DIVIDER,
		pressing: calculateAverageStat(starters, "pressing"),
		resistance: calculateAverageStat(starters, "resistance"),
		
		attackCenter: calculateSector(starters, { finishing: 1, vision: 0.5, explosivity: 0.5 }, { GK: 0, DEF: 0, MID: 0.4, FWD: 1.4 }, "C", currentDay, currentSeason, matchPressure, coachImpact) / DIVIDER,
		attackLeft: calculateSector(starters, { creation: 1, vision: 0.5, explosivity: 1 }, { GK: 0, DEF: 0.1, MID: 1.0, FWD: 0.7 }, "L", currentDay, currentSeason, matchPressure, coachImpact) / DIVIDER,
		attackRight: calculateSector(starters, { creation: 1, vision: 0.5, explosivity: 1 }, { GK: 0, DEF: 0.1, MID: 1.0, FWD: 0.7 }, "R", currentDay, currentSeason, matchPressure, coachImpact) / DIVIDER,
		
		defenseCenter: (calculateSector(starters, { intervention: 1, impact: 1 }, { GK: 1.0, DEF: 0.9, MID: 0.3, FWD: 0 }, "C", currentDay, currentSeason, matchPressure, coachImpact) * gkBonus) / DIVIDER,
		defenseLeft: calculateSector(starters, { intervention: 1, impact: 0.5, pressing: 0.5 }, { GK: 0.1, DEF: 0.8, MID: 0.4, FWD: 0 }, "L", currentDay, currentSeason, matchPressure, coachImpact) / DIVIDER,
		defenseRight: calculateSector(starters, { intervention: 1, impact: 0.5, pressing: 0.5 }, { GK: 0.1, DEF: 0.8, MID: 0.4, FWD: 0 }, "R", currentDay, currentSeason, matchPressure, coachImpact) / DIVIDER,
		
		setPieces: calculateAverageStat(starters, "finishing") * 0.7 + calculateAverageStat(starters, "vision") * 0.3,
		tacticSkill: tacticalSkill,
		tacticType: tactic,
		strategy: strategy,
        pressure: matchPressure,
	};

	const ratings = { ...baseRatings };
	
	const bonusFactor = 0.30; 
	const malusFactor = 0.30 * (1 - tacticalSkill / 20);

	if (strategy === "OFFENSIVE") {
		ratings.attackCenter *= (1 + bonusFactor);
		ratings.attackLeft *= (1 + bonusFactor);
		ratings.attackRight *= (1 + bonusFactor);
		ratings.defenseCenter *= (1 - malusFactor);
		ratings.pressing *= 1.4;
	} else if (strategy === "DEFENSIVE") {
		ratings.defenseCenter *= (1 + bonusFactor);
		ratings.defenseLeft *= (1 + bonusFactor);
		ratings.defenseRight *= (1 + bonusFactor);
		ratings.attackCenter *= (1 - malusFactor);
		ratings.resistance *= 1.4;
	}

	const tacticEffect = (TACTIC_DEFINITIONS as any)[tactic];
	if (tacticEffect) {
		for (const [key, multiplier] of Object.entries(tacticEffect)) {
			if (typeof multiplier === "number" && (ratings as any)[key] !== undefined) {
				(ratings as any)[key] *= multiplier;
			}
		}
	}

	ratingsCache.set(cacheKey, { ratings, timestamp: Date.now() });
	return ratings;
}
