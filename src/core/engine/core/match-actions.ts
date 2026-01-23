import { getNarrative } from "@/core/generators/narratives";
import { clamp } from "@/core/utils/math";
import { D20, D10, weightedPick, D100 } from "./probabilities"; 
import type { MatchResult, PlayerPosition, TacticType } from "./types";

export interface PlayerState {
    id: number; lastName: string; pos: PlayerPosition; 
    side: "L" | "C" | "R"; 
    traits: string[]; 
    v_dyn: number; confidence: number;
    stats: { [key: string]: number };
    perf: { [key: string]: number };
    entryMinute: number;
}

export interface TeamState {
    id: number;
    name: string;
    starters: PlayerState[];
    subs: any[];
    intensity: number;
    mentality: number;
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

function getActionDescription(xG: number, shooter: PlayerState, assister: PlayerState | null, type: "MISS" | "GOAL" | "SAVE" | "PENALTY" | "FK_DIRECT" | "BIG_CHANCE"): string {
    const playerTag = `[#${shooter.id}:${shooter.pos}]`;
    
    if (type === "PENALTY") return `PENALTY ! ${shooter.lastName} ${playerTag} se présente face au gardien...`;
    if (type === "FK_DIRECT") return `COUP FRANC DIRECT ! ${shooter.lastName} ${playerTag} s'élance...`;
    
    if (xG > 0.35) { // Grosse Occasion / Face à face
        if (type === "GOAL") return `QUELLE OCCASION ! ${shooter.lastName} ${playerTag} se présente seul et ne laisse aucune chance au gardien ! BUT !`;
        if (type === "SAVE") return `INCROYABLE ARRÊT ! Le gardien remporte son face-à-face contre ${shooter.lastName} ${playerTag} !`;
        return `L'IMMANQUABLE ! ${shooter.lastName} ${playerTag} rate le cadre alors qu'il était seul !`;
    }

    if (xG < 0.08) {
        if (type === "GOAL") return `BUT SURPRISE DE ${shooter.lastName} ${playerTag} !`;
        if (type === "SAVE") return `Frappe lointaine de ${shooter.lastName} ${playerTag} captée.`;
        return `Tentative osée de ${shooter.lastName} ${playerTag} qui s'envole.`;
    }
    
    if (type === "GOAL") return `BUT ! ${shooter.lastName} ${playerTag} conclut victorieusement !`;
    if (type === "SAVE") return `PARADE ! Le gardien repousse le tir de ${shooter.lastName} ${playerTag} !`;
    return `L'occasion manquée pour ${shooter.lastName} ${playerTag} !`;
}

export function handleResolution(
    min: number, 
    att: TeamState, 
    def: TeamState, 
    res: MatchResult, 
    isCounter: boolean, 
    homeId: number, 
    baseOverride?: number,
    log?: (msg: string) => void,
    isPenalty = false,
    isFKDirect = false,
    isBigChance = false
): "GOAL" | "SAVE" | "MISS" | "CORNER" {
    const shooters = att.starters.filter(p => p.pos !== "GK");
    if (shooters.length === 0) return "MISS";

    // 1. CALCUL xG
    let xG = isPenalty ? 0.79 : (baseOverride || (isCounter ? 0.25 : 0.15)); // Base augmentée à 0.15
    if (isFKDirect) xG = 0.10; 
    if (isBigChance) xG = 0.38; // Standard Grosse Occasion Opta

    const shooter = weightedPick(shooters.map(p => {
        let weight = (p.pos === "FWD" ? 50 : 10);
        if (isPenalty && p.traits.includes("PENALTY_SPECIALIST")) weight *= 2;
        if (isFKDirect && p.traits.includes("FREE_KICK_EXPERT")) weight *= 3;
        return { item: p, weight };
    }))!;

    const gk = def.starters.find(p => p.pos === "GK") || def.starters[0];
    
    // 2. DUEL
    let forceAtt = (shooter.perf?.shooting || 10);
    if (isPenalty) forceAtt += (shooter.perf?.composure || 10);
    if (isFKDirect) forceAtt = (forceAtt + (shooter.perf?.flair || 10)) * 1.2;
    if (isBigChance) forceAtt += (shooter.perf?.composure || 5);

    const forceGK = (gk.perf?.goalkeeping || 10) + (isPenalty ? (gk.perf?.agility || 10) : 0); 
    const skillRatio = forceAtt / (forceAtt + forceGK);
    
    // Probabilité finale
    const goalProb = clamp(xG * (skillRatio * 1.8), 0.02, 0.95);

    log?.(`Duel ${isPenalty ? '[PEN]' : (isFKDirect ? '[FK]' : (isBigChance ? '[BIG]' : '[TIR]'))}: ${shooter.lastName} (${forceAtt.toFixed(1)}) vs ${gk.lastName} (${forceGK.toFixed(1)}) | xG: ${xG.toFixed(2)} | Prob: ${(goalProb*100).toFixed(1)}%`);

    if (att.id === homeId) { res.stats.homeShots++; res.stats.homeXG += xG; } else { res.stats.awayShots++; res.stats.awayXG += xG; }

    if (Math.random() < goalProb) {
        log?.(`Résultat: BUT !`);
        if (att.id === homeId) { res.homeScore++; res.stats.homeShotsOnTarget++; } else { res.awayScore++; res.stats.awayShotsOnTarget++; }
        const pS = res.playerStats![shooter.id.toString()];
        if (pS) { pS.goals++; pS.shotsOnTarget++; pS.xg += xG; }
        
        const desc = isPenalty ? `BUT SUR PENALTY ! ${shooter.lastName}` : (isFKDirect ? `COUP FRANC MAGNIFIQUE ! ${shooter.lastName} trompe le gardien.` : getActionDescription(xG, shooter, null, "GOAL"));
        res.events.push({ minute: min, second: 30, type: "GOAL", teamId: att.id, scorerName: shooter.lastName, description: desc, xg: xG });
        return "GOAL";
    } else {
        const type = Math.random() < 0.6 ? "SAVE" : "MISS";
        log?.(`Résultat: ${type === "SAVE" ? "ARRÊT" : "LOUPÉ"}`);
        if (type === "SAVE") {
            const gkS = res.playerStats![gk.id.toString()]; if (gkS) gkS.saves++;
            if (att.id === homeId) res.stats.homeShotsOnTarget++; else res.stats.awayShotsOnTarget++;
            const pS = res.playerStats![shooter.id.toString()]; if (pS) pS.shotsOnTarget++;
            if (!isPenalty && Math.random() < 0.35) return "CORNER";
        }
        res.events.push({ minute: min, second: 30, type: type === "SAVE" ? "SHOT" : "MISS", teamId: att.id, description: getActionDescription(xG, shooter, null, type as any), xg: xG });
        return type === "SAVE" ? "SAVE" : "MISS";
    }
}

export function handleSetPiece(
    min: number, 
    att: TeamState, 
    def: TeamState, 
    res: MatchResult, 
    homeId: number, 
    log?: (msg: string) => void,
    forcedType?: "CORNER" | "FREE_KICK" | "PENALTY" | "LONG_THROW",
    zone?: number
): "GOAL" | "SAVE" | "MISS" | "CORNER" | "SET_PIECE" {
    if (forcedType === "PENALTY") return handleResolution(min, att, def, res, false, homeId, undefined, log, true);

    const isHome = att.id === homeId;
    const inAttackingThird = isHome ? (zone! >= 4) : (zone! <= 2);
    const inExtremeDanger = isHome ? (zone === 5) : (zone === 1);
    const roll = D100();
    
    // 1. CORNERS
    if (forcedType === "CORNER") {
        res.events.push({ minute: min, second: 30, type: "CORNER", teamId: att.id, description: `🚩 CORNER pour ${att.name}` });
        if (D100() < 3) return handleResolution(min, att, def, res, false, homeId, 0.30, log); 
        return handleResolution(min, att, def, res, false, homeId, 0.10, log);
    }

    // 2. TOUCHES LONGUES
    if (forcedType === "LONG_THROW" || (inAttackingThird && roll < 5)) {
        res.events.push({ minute: min, second: 30, type: "SPECIAL", teamId: att.id, description: `🙌 TOUCHE LONGUE de ${att.name} dans la boîte` });
        return handleResolution(min, att, def, res, false, homeId, 0.05, log);
    }

    // 3. COUPS FRANCS
    if (inExtremeDanger) {
        if (roll < 20) {
            return handleResolution(min, att, def, res, false, homeId, undefined, log, false, true);
        } else {
            res.events.push({ minute: min, second: 30, type: "FREE_KICK", teamId: att.id, description: `📐 Coup franc indirect pour ${att.name}` });
            return handleResolution(min, att, def, res, false, homeId, 0.15, log);
        }
    } else if (inAttackingThird) {
        res.events.push({ minute: min, second: 30, type: "FREE_KICK", teamId: att.id, description: `📐 Coup franc lointain pour ${att.name}` });
        return handleResolution(min, att, def, res, false, homeId, 0.08, log);
    }

    res.events.push({ minute: min, second: 30, type: "SET_PIECE", teamId: att.id, description: `${att.name} joue court.` });
    return "SET_PIECE"; 
}
