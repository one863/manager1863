import { getNarrative } from "@/core/generators/narratives";
import { clamp } from "@/core/utils/math";
import { D20, D10, weightedPick } from "./probabilities"; 
import { TACTIC_DEFINITIONS } from "./tactics"; 
import type { MatchResult, PlayerPosition, TacticType, PlayerSideSchema } from "./types";
import { ENGINE_TUNING } from "./config";

export interface PlayerState {
    id: number; lastName: string; pos: PlayerPosition; 
    side: "L" | "C" | "R"; 
    traits: string[]; 
    v_dyn: number; confidence: number;
    stats: { [key: string]: number };
    perf: { [key: string]: number };
}

export interface TeamState {
    id: number;
    name: string;
    starters: PlayerState[];
    subs: any[];
    intensity: number;
    cohesion: number;
    tactic: TacticType; 
    sectorStats: { 
        midfield: number;
        attackLeft: number;
        attackCenter: number;
        attackRight: number;
        defense: number;
    };
    staff: { tactical: number; coaching: number; reading: number; recovery: number; conditioning: number; medicine?: number; };
    subsUsed: number;
    subsSlots: number;
}

/**
 * MOTEUR 90-S V4.6.7 (POLISSAGE FINAL)
 */
export function handleResolution(
    min: number, 
    att: TeamState, 
    def: TeamState, 
    res: MatchResult, 
    isCounter: boolean, 
    homeId: number, 
    baseOverride?: number
) {
    const shooters = att.starters.filter(p => p.pos !== "GK");
    const shooter = weightedPick(shooters.map(p => ({ 
        item: p, 
        weight: p.perf.q_shoot + (p.pos === "FWD" ? 15 : 0) 
    })));
    const gk = def.starters.find(p => p.pos === "GK") || def.starters[0];
    if (!shooter) return;

    // --- 1. CALCUL DE L'xG ---
    const baseTheo = baseOverride || (isCounter ? 0.30 : 0.15);
    const xG = Math.max(ENGINE_TUNING.XG_VARIANCE_FLOOR, baseTheo * (D10() / 10));

    // --- 2. ENREGISTREMENT xG (Dashboard) ---
    const pS = res.playerStats![shooter.id.toString()];
    if (att.id === homeId) { res.stats.homeShots++; res.stats.homeXG += xG; } 
    else { res.stats.awayShots++; res.stats.awayXG += xG; }
    if (pS) pS.shots++;

    // --- 3. TEST DU CADRE (PRÉCISION V4.6.7 : SEUIL 19.5) ---
    const accuracyThreshold = 19.5 - (xG * 20); 
    const nBonus = (shooter.perf.n_com || 10) * 0.4;
    const accuracyRoll = D20() + nBonus;
    
    // Estimation dynamique de l'ancre
    const targetDiff = accuracyThreshold - nBonus;
    const estimatedAccuracy = clamp((21 - targetDiff) / 20, 0.1, 0.9);

    if (accuracyRoll < accuracyThreshold) {
        if (pS) pS.ballsLost++;
        res.events.push({ minute: min, type: "MISS", teamId: att.id, description: `Tir non cadré de ${shooter.lastName}.`, xg: xG });
        return;
    }

    // --- 4. DUEL PROBABILISTE (LOGARITHMIQUE) ---
    if (att.id === homeId) res.stats.homeShotsOnTarget++; else res.stats.awayShotsOnTarget++;
    if (pS) pS.shotsOnTarget++;

    const attForce = Math.max(1, (shooter.perf.q_shoot + shooter.confidence + D20()));
    const scoreDiff = att.id === homeId ? (res.homeScore - res.awayScore) : (res.awayScore - res.homeScore);
    const saturationBonus = scoreDiff > 1 ? (scoreDiff * ENGINE_TUNING.DENSITY_IMPACT) : 0;
    const defForce = Math.max(1, ((gk.stats.goalkeeping || 10) * (1 + saturationBonus) + D20()));

    const talentRatio = 1 + Math.log10(attForce / defForce);
    
    // Probabilité de But GIVEN On-Target
    const goalProb = clamp((xG / estimatedAccuracy) * talentRatio, 0.01, 0.95);
    
    if (Math.random() < goalProb) {
        // BUT
        if (att.id === homeId) res.homeScore++; else res.awayScore++;
        if (pS) { pS.goals++; pS.duelsWon++; }
        res.events.push({ minute: min, type: "GOAL", teamId: att.id, scorerName: shooter.lastName, description: `But de ${shooter.lastName} !`, xg: xG });
    } else {
        // ARRÊT DU GARDIEN
        if (res.playerStats![gk.id.toString()]) res.playerStats![gk.id.toString()].saves++;
        res.events.push({ minute: min, type: "SHOT", teamId: att.id, description: `Parade du gardien face à ${shooter.lastName}.`, xg: xG });
    }
}

export function handleSetPiece(min: number, att: TeamState, def: TeamState, res: MatchResult, homeId: number) {
    const roll = Math.random() * 100;
    if (roll < 10) { 
        const shooter = att.starters.sort((a,b) => b.stats.shooting - a.stats.shooting)[0];
        const gk = def.starters.find(p => p.pos === "GK") || def.starters[0];
        if (att.id === homeId) { res.stats.homeShots++; res.stats.homeXG += 0.76; } 
        else { res.stats.awayShots++; res.stats.awayXG += 0.76; }
        
        const prob = (shooter.stats.shooting + 10) / (shooter.stats.shooting + (gk.stats.goalkeeping || 10) + 20);
        if (Math.random() < prob) {
            if (att.id === homeId) { res.homeScore++; res.stats.homeShotsOnTarget++; } 
            else { res.awayScore++; res.stats.awayShotsOnTarget++; }
            res.events.push({ minute: min, type: "GOAL", teamId: att.id, description: `Penalty transformé par ${shooter.lastName}.`, xg: 0.76 });
        } else {
            if (att.id === homeId) res.stats.homeShotsOnTarget++; else res.stats.awayShotsOnTarget++;
            res.events.push({ minute: min, type: "MISS", teamId: att.id, description: `Penalty arrêté !`, xg: 0.76 });
        }
    } else {
        handleResolution(min, att, def, res, false, homeId, 0.12);
    }
}
