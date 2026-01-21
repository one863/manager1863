import { getNarrative } from "@/core/generators/narratives";
import { clamp } from "@/core/utils/math";
import { D20, D10, weightedPick, D100 } from "./probabilities"; 
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

function getActionDescription(xG: number, shooter: PlayerState, assister: PlayerState | null, type: "MISS" | "GOAL" | "SAVE"): string {
    const shooterTag = `[ID:${shooter.id}]`;
    const assistTag = assister ? ` [AssistID:${assister.id}]` : "";

    if (xG < 0.07) {
        if (type === "GOAL") return `${shooterTag} BUT INCROYABLE DE ${shooter.lastName} !${assistTag}`;
        if (type === "SAVE") return `${shooterTag} Frappe lointaine de ${shooter.lastName} captée.`;
        return `${shooterTag} Tentative lointaine de ${shooter.lastName} qui passe à côté.`;
    }
    
    if (xG <= 0.15) {
        const assistText = assister ? `sur un service de ${assister.lastName}` : "sur une action individuelle";
        if (type === "GOAL") return `${shooterTag} BUT ! ${shooter.lastName} conclut ${assistText}.${assistTag}`;
        if (type === "SAVE") return `${shooterTag} Belle parade sur une frappe de ${shooter.lastName}.`;
        return `${shooterTag} Reprise de ${shooter.lastName} qui frôle le poteau.`;
    }

    if (type === "GOAL") return `${shooterTag} BUT ! ${shooter.lastName} remporte son duel face au gardien !${assistTag}`;
    if (type === "SAVE") return `${shooterTag} PARADE DÉCISIVE ! Le gardien sauve le tir à bout portant !`;
    return `${shooterTag} L'IMMANQUABLE ! ${shooter.lastName} rate le cadre seul face au but !`;
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
    currentZone?: number,
    saturationIndex: number = 0,
    mentalityBoost: number = 0
) {
    const isHomeAttacking = att.id === homeId;
    
    if (currentZone) {
        const col = Math.floor((currentZone - 1) / 5) + 1;
        const relativeCol = isHomeAttacking ? col : 7 - col;
        if (relativeCol < 5) {
            log?.(`    [BLOCAGE] Tir refusé : Position trop lointaine (Zone ${currentZone}, Col ${relativeCol} relative).`);
            return;
        }
    }

    const shooters = att.starters.filter(p => p.pos !== "GK");
    if (shooters.length === 0) return;

    const posRoll = D10();
    const baseTheo = baseOverride || (isCounter ? 0.30 : 0.15);
    let xG = (baseTheo * (posRoll / 10)) + mentalityBoost;
    
    const densityPenalty = 1 - (saturationIndex * 0.15);
    xG = xG * Math.max(0.4, densityPenalty);

    let isGoldenZone = false;
    let isSilverZone = false; 

    if (currentZone) {
        const col = Math.floor((currentZone - 1) / 5) + 1;
        const relativeCol = isHomeAttacking ? col : 7 - col;
        if (relativeCol === 6) isGoldenZone = true;
        else if (relativeCol === 5) isSilverZone = true;
    }

    if (isGoldenZone) xG = Math.max(xG * 1.5, 0.25); 
    else if (isSilverZone) xG = Math.max(xG, 0.08); 
    else xG *= 0.5; 

    const shooter = weightedPick(shooters.map(p => {
        let weight = (p.perf?.n_pla || 5); 
        if (isGoldenZone || isSilverZone) {
            if (p.pos === "FWD") weight *= 8;
            if (p.pos === "MID") weight *= 2;
        } else {
            if (p.pos === "MID") weight *= 4;
            if (p.pos === "FWD") weight *= 2;
            if (p.stats.shooting > 14) weight *= 2; 
        }
        return { item: p, weight };
    }));
    
    const gk = def.starters.find(p => p.pos === "GK") || def.starters[0];
    if (!shooter) return;

    const others = att.starters.filter(p => p.id !== shooter.id && p.pos !== "GK");
    const assister = others.length > 0 ? weightedPick(others.map(p => ({
        item: p,
        weight: (p.perf?.q_pass || 5) + (p.perf?.n_vis || 5) + (p.side !== "C" ? 5 : 0)
    }))) : null;

    if (att.id === homeId) { res.stats.homeShots++; res.stats.homeXG += xG; } 
    else { res.stats.awayShots++; res.stats.awayXG += xG; }

    const sTag = `[ID:${shooter.id}]`;
    const gTag = `[GKID:${gk.id}]`;

    log?.(`    [ACTION] 🎯 ${sTag} ${shooter.lastName} (${shooter.pos}) tente sa chance ! [xG: ${xG.toFixed(2)}] (Fatigue:${saturationIndex.toFixed(1)})`);

    const accuracyThreshold = Math.max(5, 16 - (xG * 20)); 
    const composureVal = (shooter.perf?.n_com) || 5;
    const shootingVal = (shooter.perf?.q_shoot) || 10;
    const accuracyScore = (shootingVal * 0.6) + (composureVal * 0.2) + (D20() * 0.4); 
    
    if (accuracyScore < accuracyThreshold) {
        const desc = getActionDescription(xG, shooter, assister, "MISS");
        res.events.push({ minute: min, type: "MISS", teamId: att.id, description: desc, xg: xG });
        log?.(`    -> ❌ [HORS CADRE] ${sTag} Score: ${accuracyScore.toFixed(1)} < Seuil: ${accuracyThreshold.toFixed(1)}`);
        return;
    }

    if (att.id === homeId) res.stats.homeShotsOnTarget++; else res.stats.awayShotsOnTarget++;
    const pS = res.playerStats![shooter.id.toString()];
    if (pS) pS.shotsOnTarget++;

    const attRoll = D10(); 
    const defRoll = D10();
    const forceAtt = ((shooter.perf?.q_shoot || 10) * 1.5) + attRoll;
    const forceDef = ((gk.stats.goalkeeping || 10) * 1.5) + defRoll;
    const ratio = forceAtt / (forceDef || 1);
    let powerFactor = Math.pow(ratio, 3.0); 
    const goalProb = clamp((xG / 0.40) * powerFactor, 0.01, 0.95);

    log?.(`    -> [CADRÉ] ${sTag} vs ${gTag} | Ratio: ${ratio.toFixed(2)} | Prob: ${(goalProb * 100).toFixed(1)}%`);

    let isGoal = false;
    if (Math.random() < goalProb) isGoal = true;

    if (isGoal) {
        if (att.id === homeId) res.homeScore++; else res.awayScore++;
        if (pS) { pS.goals++; pS.duelsWon++; }
        if (assister) {
            const aS = res.playerStats![assister.id.toString()];
            if (aS) aS.assists++;
        }
        const desc = getActionDescription(xG, shooter, assister, "GOAL");
        res.events.push({ minute: min, type: "GOAL", teamId: att.id, scorerName: shooter.lastName, description: desc, xg: xG });
        log?.(`    -> ⚽ [BUT PENALTY] Scorer:${shooter.id}${assister ? ` Assist:${assister.id}` : ""}`);
    } else {
        const gkS = res.playerStats![gk.id.toString()];
        if (gkS) { gkS.saves++; gkS.duelsWon++; }
        if (pS) pS.duelsLost++;
        const desc = getActionDescription(xG, shooter, assister, "SAVE");
        res.events.push({ minute: min, type: "SHOT", teamId: att.id, description: desc, xg: xG });
        log?.(`    -> 🧤 [PARADE] Saver:${gk.id} (Shooter:${shooter.id})`);
    }
}

export function handleSetPiece(min: number, att: TeamState, def: TeamState, res: MatchResult, homeId: number, log?: (msg: string) => void) {
    const roll = D100();
    const gk = def.starters.find(p => p.pos === "GK") || def.starters[0];

    if (roll < 2) { 
        log?.(`    [CPA] 🎯 Penalty obtenu !`);
        const shooter = att.starters.filter(p => p.pos !== "GK")
            .sort((a,b) => {
                const scoreA = (a.stats.shooting) + (a.pos === "FWD" ? 5 : 0);
                const scoreB = (b.stats.shooting) + (b.pos === "FWD" ? 5 : 0);
                return scoreB - scoreA;
            })[0];

        const shootSkill = (shooter.stats.shooting * 1.5) + D10();
        const gkSkill = (gk.stats.goalkeeping * 1.5) + D10();
        const prob = clamp(0.75 + ((shootSkill - gkSkill) * 0.02), 0.1, 0.95);

        if (Math.random() < prob) {
            if (att.id === homeId) res.homeScore++; else res.awayScore++;
            res.events.push({ minute: min, type: "GOAL", teamId: att.id, scorerName: shooter.lastName, description: `[ID:${shooter.id}] Penalty transformé par ${shooter.lastName}.`, xg: 0.76 });
            log?.(`    -> ⚽ [BUT PENALTY] Scorer:${shooter.id}`);
        } else {
            const gkS = res.playerStats![gk.id.toString()];
            if (gkS) gkS.saves++;
            res.events.push({ minute: min, type: "MISS", teamId: att.id, description: `[ID:${shooter.id}] Penalty arrêté par le gardien [GKID:${gk.id}] !`, xg: 0.76 });
            log?.(`    -> ❌ [PENALTY RATÉ] Shooter:${shooter.id} Saver:${gk.id}`);
        }
    } 
    else {
        log?.(`    [CPA] 🚩 Corner / Coup Franc !`);
        const attP = att.starters.reduce((s, p) => s + (p.stats.jumping || 10) + (p.stats.strength || 10), 0) / 11;
        const defP = def.starters.reduce((s, p) => s + (p.stats.jumping || 10) + (p.stats.strength || 10), 0) / 11;
        if ((attP * 1.2 + D20()) > (defP * 1.2 + D20())) {
            log?.(`    -> 💥 Duel aérien gagné`);
            handleResolution(min, att, def, res, false, homeId, 0.18, log);
        } else {
            res.events.push({ minute: min, type: "SET_PIECE", teamId: att.id, description: `Corner repoussé par la défense.` });
            log?.(`    -> 🛡️ Repoussé`);
        }
    }
}
