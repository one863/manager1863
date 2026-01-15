import { getNarrative } from "@/data/narratives";
import { type Player, db } from "@/db/db";
import { NewsService } from "@/services/news-service";
import { clamp } from "@/utils/math";
import { TACTIC_DEFINITIONS } from "./tactics";
import type { NewsArticle, TeamRatings } from "./types";

const ratingsCache = new Map<
	string,
	{ ratings: TeamRatings; timestamp: number }
>();

function getCacheKey(starters: Player[], tactic: string, strategy: string, tacticalSkill: number): string {
	const ids = starters
		.map((p) => p.id)
		.sort()
		.join(",");
	return `${ids}-${tactic}-${strategy}-${tacticalSkill}`;
}

function calculateSector(
	starters: Player[],
	weights: Record<Player["position"], number>,
	targetSide: "L" | "C" | "R" | "ALL",
	bonus = 1.0,
): number {
	return (
		starters.reduce((acc, p) => {
			const formMultiplier = 0.6 + (p.form || 5) / 10;
			const contribution =
				p.skill * (weights[p.position] || 0) * (p.condition / 100) * formMultiplier;

			let sideFactor = 1.0;
			const pSide = p.side || "C";

			if (targetSide !== "ALL") {
				if (pSide === targetSide) {
					sideFactor = 1.0;
				} else if (pSide === "C" || targetSide === "C") {
					sideFactor = 0.75;
				} else {
					sideFactor = 0.25;
				}
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
	tacticalSkill = 5.0, // Niveau tactique du coach (1-10)
): TeamRatings {
	let starters = players.filter((p) => p.isStarter);
	let wasRandom = false;

	if (starters.length < 11) {
		const remainingCount = 11 - starters.length;
		const availablePlayers = players.filter((p) => !p.isStarter);
		const bestAvailable = [...availablePlayers].sort((a, b) => b.skill - a.skill);
		starters = [...starters, ...bestAvailable.slice(0, remainingCount)];
		wasRandom = true;
	}

	if (wasRandom && saveId && date) {
		const narrative = getNarrative("board", "randomSquad");
		const news: Omit<NewsArticle, "id" | "saveId" | "isRead"> = {
			date,
			day: 0,
			title: narrative.title || "ALERTE TACTIQUE",
			content: narrative.content,
			type: "BOARD",
			importance: 2,
		};
		NewsService.addNews(saveId, news);
	}

	const cacheKey = getCacheKey(starters, tactic, strategy, tacticalSkill);
	const cached = ratingsCache.get(cacheKey);
	if (cached && Date.now() - cached.timestamp < 60000) return cached.ratings;

	const hasGK = starters.some((p) => p.position === "GK");
	const gkBonus = hasGK ? 1.0 : 0.2;

	const baseRatings: TeamRatings = {
		midfield: calculateSector(
			starters,
			{ GK: 0, DEF: 0.2, MID: 1.0, FWD: 0.2 },
			"ALL",
		),

		attackCenter: calculateSector(starters, { GK: 0, DEF: 0, MID: 0.4, FWD: 1.4 }, "C"),
		attackLeft: calculateSector(starters, { GK: 0, DEF: 0.1, MID: 1.0, FWD: 0.7 }, "L"),
		attackRight: calculateSector(starters, { GK: 0, DEF: 0.1, MID: 1.0, FWD: 0.7 }, "R"),

		defenseCenter: calculateSector(starters, { GK: 1.0, DEF: 0.9, MID: 0.3, FWD: 0 }, "C") * gkBonus,
		defenseLeft: calculateSector(starters, { GK: 0.1, DEF: 0.8, MID: 0.4, FWD: 0 }, "L"),
		defenseRight: calculateSector(starters, { GK: 0.1, DEF: 0.8, MID: 0.4, FWD: 0 }, "R"),

		setPieces: starters.reduce((acc, p) => acc + (p.stats.setPieces || p.stats.shooting || 0), 0) / 11,
		tacticSkill: tacticalSkill,
		tacticType: tactic,
		strategy: strategy,
	};

	const DIVIDER = 6;
	const ratings = { ...baseRatings };
	
	// --- Application de la Logique de Stratégie & Coach ---
	const strategyMalusBase = 0.15;
	const malusFactor = strategyMalusBase * (1 - tacticalSkill / 10); 
	const bonusFactor = 0.15;

	// --- Logique de Cohésion (Synergie Tactique/Stratégie) ---
	let cohesionMultiplier = 1.0;
	
	// Synergies positives (+5%)
	if (strategy === "OFFENSIVE" && (tactic === "PRESSING" || tactic === "AOW")) {
		cohesionMultiplier = 1.05;
	} else if (strategy === "DEFENSIVE" && (tactic === "CA" || tactic === "NORMAL")) {
		cohesionMultiplier = 1.05;
	} else if (strategy === "BALANCED") {
		cohesionMultiplier = 1.02; // Petit bonus pour la stabilité
	}
	
	// Conflits négatifs (-5% si coach inexpérimenté)
	// Un bon coach (tacticalSkill > 7) arrive à éviter le malus de conflit
	if (tacticalSkill < 7) {
		if (strategy === "OFFENSIVE" && tactic === "CA") cohesionMultiplier = 0.95;
		if (strategy === "DEFENSIVE" && tactic === "PRESSING") cohesionMultiplier = 0.95;
	}

	if (strategy === "OFFENSIVE") {
		ratings.attackCenter *= (1 + bonusFactor) * cohesionMultiplier;
		ratings.attackLeft *= (1 + bonusFactor) * cohesionMultiplier;
		ratings.attackRight *= (1 + bonusFactor) * cohesionMultiplier;
		
		ratings.defenseCenter *= (1 - malusFactor);
		ratings.defenseLeft *= (1 - malusFactor);
		ratings.defenseRight *= (1 - malusFactor);
	} else if (strategy === "DEFENSIVE") {
		ratings.defenseCenter *= (1 + bonusFactor) * cohesionMultiplier;
		ratings.defenseLeft *= (1 + bonusFactor) * cohesionMultiplier;
		ratings.defenseRight *= (1 + bonusFactor) * cohesionMultiplier;
		
		ratings.attackCenter *= (1 - malusFactor);
		ratings.attackLeft *= (1 - malusFactor);
		ratings.attackRight *= (1 - malusFactor);
	} else {
		// Balanced
		const sectorsToApply = ["midfield", "attackLeft", "attackCenter", "attackRight", "defenseLeft", "defenseCenter", "defenseRight"];
		for (const s of sectorsToApply) {
			(ratings as any)[s] *= cohesionMultiplier;
		}
	}

	const sectors: (keyof TeamRatings)[] = [
		"midfield", "attackLeft", "attackCenter", "attackRight", "defenseLeft", "defenseCenter", "defenseRight",
	];

	for (const sector of sectors) {
		if (typeof (ratings as any)[sector] === "number") {
			(ratings as any)[sector] = clamp((ratings as any)[sector] / DIVIDER, 1, 10.99);
		}
	}

	ratings.setPieces = clamp(ratings.setPieces, 1, 10.99);

	const effect = (TACTIC_DEFINITIONS as any)[tactic];
	if (effect) {
		for (const [key, multiplier] of Object.entries(effect)) {
			if (typeof multiplier === "number" && (ratings as any)[key] !== undefined) {
				(ratings as any)[key] *= multiplier;
				(ratings as any)[key] = clamp((ratings as any)[key], 1, 10.99);
			}
		}
	}

	ratingsCache.set(cacheKey, { ratings, timestamp: Date.now() });
	return ratings;
}
