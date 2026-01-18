import { getNarrative } from "@/core/generators/narratives";
import type { Player } from "@/core/db/db";
import { clamp, probability, weightedPick } from "@/core/utils/math";
import { 
	calculateSuccessRate, 
	getFatiguePenalty
} from "./probabilities";
import type { MatchResult, TeamRatings, PlayerMatchStats } from "./types";

/**
 * Calcule la stat effective d'un joueur selon sa forme
 */
export function getEffectiveStat(stat: number, form: number): number {
    const safeForm = (form !== undefined && !isNaN(form)) ? form : 5;
	const multiplier = 0.6 + safeForm / 10;
	return stat * multiplier;
}

/**
 * Gère une phase d'attaque placée
 */
export function handleNormalAttack(
    result: MatchResult, 
    min: number, 
    side: "home" | "away", 
    attR: TeamRatings, 
    defR: TeamRatings, 
    teamId: number, 
    attP: Player[], 
    defP: Player[], 
    teamName: string
) {
	if (!attP || attP.length === 0) return;
	const sector = Math.random() < 0.33 ? "Left" : Math.random() < 0.5 ? "Right" : "Center";
	
    // Vérification de la réussite de la transition vers le dernier tiers
    const successRate = calculateSuccessRate(
        (attR as any)[`attack${sector}`], 
        (defR as any)[`defense${sector === "Left" ? "Right" : sector === "Right" ? "Left" : "Center"}`], 
        1.2
    );

	if (!probability(successRate)) return;
	
	const shooter = weightedPick(attP.map(p => ({ item: p, weight: p.position === "FWD" ? 15 : p.position === "MID" ? 5 : 1 })));
	const assister = attP.length > 1 ? weightedPick(attP.filter(p => p.id !== shooter.id).map(p => ({ item: p, weight: p.position === "MID" ? 15 : 2 }))) : null;
	const gk = defP.find(p => p.position === "GK");
	
	const sS = getEffectiveStat(shooter.stats.finishing, shooter.form) * getFatiguePenalty(shooter.energy || 100);
	const gS = gk ? getEffectiveStat(gk.stats.goalkeeping || 10, gk.form) * getFatiguePenalty(gk.energy || 100) : 1;
	
    let xG = calculateSuccessRate(sS, gS, 1.5) * 0.75;
	if (shooter.traits?.includes("CLUTCH_FINISHER")) xG *= 1.3;
	xG = clamp(xG, 0.05, 0.9);
	
	if (side === "home") { result.stats.homeXG += xG; result.stats.homeShots++; } else { result.stats.awayXG += xG; result.stats.awayShots++; }
	const pS = result.playerStats![shooter.id!.toString()]; 
	if (pS) { pS.shots++; pS.xg += xG; }
	
	if (probability(xG)) {
		if (side === "home") result.homeScore++; else result.awayScore++;
		if (pS) pS.goals++;
		if (assister) {
			const aS = result.playerStats![assister.id!.toString()];
			if (aS) aS.assists++;
		}
		const narrative = getNarrative("match", "goal", { player: shooter.lastName, team: teamName });
		result.events.push({ minute: min, type: "GOAL", teamId, scorerId: shooter.id, scorerName: shooter.lastName, description: narrative.content || "But !", xg: xG });
	} else if (xG > 0.15) {
		const narrative = getNarrative("match", "miss", { player: shooter.lastName });
		result.events.push({ minute: min, type: "MISS", teamId, description: gk && probability(0.5) ? `${gk.lastName} réalise un arrêt décisif !` : (narrative.content || "Occasion manquée"), xg: xG });
	} else {
		result.events.push({ minute: min, type: "SHOT", teamId, description: "Tir non cadré", xg: xG });
	}
}

/**
 * Gère une phase de coup de pied arrêté
 */
export function handleSetPiece(
    result: MatchResult, 
    min: number, 
    side: "home" | "away", 
    attR: TeamRatings, 
    defR: TeamRatings, 
    teamId: number, 
    attP: Player[], 
    defP: Player[], 
    teamName: string, 
    oppP: Player[]
) {
	if (!attP || attP.length === 0) return;

	const typeRoll = Math.random();
	let description = "", xG = 0;
	let type: "CORNER" | "FREE_KICK" | "THROW_IN" | "PENALTY" = "CORNER";

	if (typeRoll < 0.5) { 
        type = "CORNER"; description = "sur corner"; 
        xG = clamp(calculateSuccessRate(attR.setPieces, defR.defenseCenter, 1.3) * 0.35, 0.1, 0.5); 
    }
    else if (typeRoll < 0.8) { 
        type = "FREE_KICK"; description = "sur coup franc indirect"; 
        xG = clamp(calculateSuccessRate(attR.setPieces, defR.defenseCenter, 1.4) * 0.3, 0.1, 0.45); 
    }
    else if (typeRoll < 0.85) { 
        type = "THROW_IN"; description = "sur une touche longue"; 
        xG = clamp(calculateSuccessRate(attR.setPieces, defR.defenseCenter, 1.2) * 0.2, 0.05, 0.35); 
    }
    else { 
        type = "PENALTY"; description = "sur penalty"; 
        xG = 0.75; 
    }

	if (side === "home") { result.stats.homeXG += xG; result.stats.homeShots++; } else { result.stats.awayXG += xG; result.stats.awayShots++; }
	
	const sorted = [...attP].sort((a,b) => (b.stats.impact || 0) - (a.stats.impact || 0));
	const shooter = type === "PENALTY" ? sorted[0] : weightedPick(attP.map(p => ({ item: p, weight: p.position === "FWD" ? 10 : p.position === "DEF" ? 5 : 2 })));
	
	const pS = result.playerStats![shooter.id!.toString()]; 
	if (pS) { pS.shots++; pS.xg += xG; }

	if (probability(xG)) {
		if (side === "home") result.homeScore++; else result.awayScore++;
		if (pS) pS.goals++;
		result.events.push({ minute: min, type: "GOAL", teamId, scorerId: shooter.id, scorerName: shooter.lastName, description: `But de ${shooter.lastName} ${description} !`, xg: xG });
	} else {
		if (type === "PENALTY") {
			const gk = oppP.find(p => p.position === "GK");
			result.events.push({ minute: min, type: "MISS", teamId, description: gk && probability(0.5) ? `Arrêt du gardien sur le penalty de ${shooter.lastName} !` : `Penalty manqué par ${shooter.lastName} !`, xg: xG });
		} else if (xG > 0.15) {
			result.events.push({ minute: min, type: "MISS", teamId, description: `Grosse occasion manquée ${description} !`, xg: xG });
		} else {
			result.events.push({ minute: min, type: "SHOT", teamId, description: `Tir ${description}`, xg: xG });
		}
	}
}
