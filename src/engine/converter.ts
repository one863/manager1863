import { getNarrative } from "@/data/narratives";
import { type Player, db } from "@/db/db";
import { NewsService } from "@/services/news-service";
import { clamp } from "@/utils/math";
import { TACTIC_DEFINITIONS } from "./core/tactics";
import type { NewsArticle, TeamRatings } from "./core/types";

const ratingsCache = new Map<
	string,
	{ ratings: TeamRatings; timestamp: number }
>();

const SECTORS: (keyof TeamRatings)[] = [
	"midfield",
	"attackLeft",
	"attackCenter",
	"attackRight",
	"defenseLeft",
	"defenseCenter",
	"defenseRight",
];

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
				} else if (targetSide === "C") {
					if (p.position === "FWD") {
						sideFactor = 0.90;
					} else {
						sideFactor = 0.75;
					}
				} else if (pSide === "C") {
					// Punit sévèrement les défenses sans latéraux (2-3-5)
					sideFactor = 0.15; 
				} else {
					sideFactor = 0.10;
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
	tacticalSkill = 5.0,
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

	// Détection des structures
	const midCount = starters.filter(p => p.position === "MID").length;
	const defCount = starters.filter(p => p.position === "DEF").length;

	// Bonus Triangle Central (4-3-3, 4-5-1)
	// Si 3 milieux ou plus, bonus de contrôle
	const midBonus = midCount >= 3 ? 1.15 : 1.0;

	// 1. Calcul des notes brutes par secteur
	const baseRatings: TeamRatings = {
		// Le milieu appartient aux milieux (+15% si >= 3 MID)
		midfield: calculateSector(starters, { GK: 0, DEF: 0.2, MID: 1.0, FWD: 0.1 }, "ALL") * midBonus,
		
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

	const ratings = { ...baseRatings };
	
	// Bonus spécifique Bus (5 Défenseurs) -> +60% défense centrale (au lieu de 40%)
	if (defCount >= 5) {
		ratings.defenseCenter *= 1.15; // Cumulé avec le poids naturel, ça fera un gros bonus
	}

	// 2. Logique de Cohésion
	let cohesionMultiplier = 1.0;
	if (strategy === "OFFENSIVE" && (tactic === "PRESSING" || tactic === "AOW")) {
		cohesionMultiplier = 1.05;
	} else if (strategy === "DEFENSIVE" && (tactic === "CA" || tactic === "NORMAL")) {
		cohesionMultiplier = 1.05;
	} else if (strategy === "BALANCED") {
		cohesionMultiplier = 1.02;
	}
	
	if (tacticalSkill < 7) {
		if (strategy === "OFFENSIVE" && tactic === "CA") cohesionMultiplier = 0.95;
		if (strategy === "DEFENSIVE" && tactic === "PRESSING") cohesionMultiplier = 0.95;
	}

	// 3. Application des Stratégies et Mise à l'échelle
	const strategyMalusBase = 0.10;
	const malusFactor = strategyMalusBase * (1 - tacticalSkill / 10); 
	const bonusFactor = 0.10;
	const DIVIDER = 4;

	for (const sector of SECTORS) {
		let val = (ratings as any)[sector] as number;
		
		val *= cohesionMultiplier;

		if (strategy === "OFFENSIVE") {
			if (sector.includes("attack")) val *= (1 + bonusFactor);
			if (sector.includes("defense")) val *= (1 - malusFactor);
		} else if (strategy === "DEFENSIVE") {
			if (sector.includes("defense")) val *= (1 + bonusFactor);
			if (sector.includes("attack")) val *= (1 - malusFactor);
		}

		(ratings as any)[sector] = clamp(val / DIVIDER, 1, 10.99);
	}

	ratings.setPieces = clamp(ratings.setPieces, 1, 10.99);

	const tacticEffect = (TACTIC_DEFINITIONS as any)[tactic];
	if (tacticEffect) {
		for (const [key, multiplier] of Object.entries(tacticEffect)) {
			if (typeof multiplier === "number" && (ratings as any)[key] !== undefined) {
				(ratings as any)[key] *= multiplier;
				(ratings as any)[key] = clamp((ratings as any)[key], 1, 10.99);
			}
		}
	}

	ratingsCache.set(cacheKey, { ratings, timestamp: Date.now() });
	return ratings;
}
