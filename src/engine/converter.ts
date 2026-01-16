import { getNarrative } from "@/data/narratives";
import { type Player } from "@/db/db";
import { NewsService } from "@/services/news-service";
import { clamp } from "@/utils/math";
import { TACTIC_DEFINITIONS } from "./core/tactics";
import type { NewsArticle, TeamRatings } from "./core/types";

const ratingsCache = new Map<
	string,
	{ ratings: TeamRatings; timestamp: number }
>();

function getCacheKey(starters: Player[], tactic: string, strategy: string, tacticalSkill: number): string {
	const ids = starters.map((p) => p.id).sort().join(",");
	return `${ids}-${tactic}-${strategy}-${tacticalSkill}`;
}

function calculateAverageStat(starters: Player[], statKey: keyof Player["stats"]): number {
	return starters.reduce((acc, p) => acc + (p.stats[statKey] || 0), 0) / starters.length;
}

function calculateSector(
	starters: Player[],
	statWeights: Partial<Record<keyof Player["stats"], number>>,
	posWeights: Record<Player["position"], number>,
	targetSide: "L" | "C" | "R" | "ALL",
	bonus = 1.0,
): number {
	return (
		starters.reduce((acc, p) => {
			const formMultiplier = 0.6 + (p.form || 5) / 10;
			
			let statContribution = 0;
			let totalWeight = 0;
			for (const [stat, weight] of Object.entries(statWeights)) {
				statContribution += (p.stats[stat as keyof Player["stats"]] || 0) * weight!;
				totalWeight += weight!;
			}
			const avgStat = totalWeight > 0 ? statContribution / totalWeight : p.skill;

			const contribution = avgStat * (posWeights[p.position] || 0) * (p.condition / 100) * formMultiplier;

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
	date?: Date,
	tacticalSkill = 10.0,
	coachPreferredStrategy: TeamRatings["strategy"] = "BALANCED",
): TeamRatings {
	let starters = players.filter((p) => p.isStarter);
	if (starters.length < 11) {
		const remainingCount = 11 - starters.length;
		const availablePlayers = players.filter((p) => !p.isStarter);
		const bestAvailable = [...availablePlayers].sort((a, b) => b.skill - a.skill);
		starters = [...starters, ...bestAvailable.slice(0, remainingCount)];
	}

	const cacheKey = getCacheKey(starters, tactic, strategy, tacticalSkill);
	const cached = ratingsCache.get(cacheKey);
	if (cached && Date.now() - cached.timestamp < 60000) return cached.ratings;

	const hasGK = starters.some((p) => p.position === "GK");
	const gkBonus = hasGK ? 1.0 : 0.2;

	// DIVIDER reduced to 0.7 to massivly boost rating values
	const DIVIDER = 0.7;

	const baseRatings: TeamRatings = {
		midfield: calculateSector(starters, { resistance: 1, volume: 1, vision: 0.5 }, { GK: 0, DEF: 0.2, MID: 1.0, FWD: 0.1 }, "ALL") / DIVIDER,
		pressing: calculateAverageStat(starters, "pressing"),
		resistance: calculateAverageStat(starters, "resistance"),
		
		attackCenter: calculateSector(starters, { finishing: 1, vision: 0.5, explosivity: 0.5 }, { GK: 0, DEF: 0, MID: 0.4, FWD: 1.4 }, "C") / DIVIDER,
		attackLeft: calculateSector(starters, { creation: 1, vision: 0.5, explosivity: 1 }, { GK: 0, DEF: 0.1, MID: 1.0, FWD: 0.7 }, "L") / DIVIDER,
		attackRight: calculateSector(starters, { creation: 1, vision: 0.5, explosivity: 1 }, { GK: 0, DEF: 0.1, MID: 1.0, FWD: 0.7 }, "R") / DIVIDER,
		
		defenseCenter: (calculateSector(starters, { intervention: 1, impact: 1 }, { GK: 1.0, DEF: 0.9, MID: 0.3, FWD: 0 }, "C") * gkBonus) / DIVIDER,
		defenseLeft: calculateSector(starters, { intervention: 1, impact: 0.5, pressing: 0.5 }, { GK: 0.1, DEF: 0.8, MID: 0.4, FWD: 0 }, "L") / DIVIDER,
		defenseRight: calculateSector(starters, { intervention: 1, impact: 0.5, pressing: 0.5 }, { GK: 0.1, DEF: 0.8, MID: 0.4, FWD: 0 }, "R") / DIVIDER,
		
		setPieces: calculateAverageStat(starters, "finishing") * 0.7 + calculateAverageStat(starters, "vision") * 0.3,
		tacticSkill: tacticalSkill,
		tacticType: tactic,
		strategy: strategy,
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
