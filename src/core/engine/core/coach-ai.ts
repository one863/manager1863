import type { Player } from "@/core/db/db";
import type { MatchEvent, StrategyType } from "./types";
import { type FormationKey } from "./tactics";

export interface CoachMatchData {
	management: number;
	tactical: number;
	preferredStrategy: StrategyType;
	formation?: FormationKey;
}

export interface SubstitutionResult {
    used: number;
    slots: number;
    events: MatchEvent[];
}

export class CoachAI {
    /**
     * Gère les décisions tactiques globales (Mentalité, Pressing, etc.)
     */
    static decideTactics(
        minute: number,
        teamId: number,
        myScore: number,
        oppScore: number,
        currentMentality: number,
        teamFloor: number,
        avgSaturation: number,
        coach: CoachMatchData | undefined,
        log?: (msg: string) => void
    ): { mentality?: number, reason?: string } {
        const scoreDiff = myScore - oppScore;
        const strategy = coach?.preferredStrategy || "BALANCED";
        let targetMentality = currentMentality;
        let reason = "";

        // 1. LOGIQUE DE CRISE / FIN DE MATCH (80e+)
        if (minute >= 80) {
            if (scoreDiff < 0) {
                targetMentality = 5; 
                reason = "Tout pour l'attaque !";
            } else if (scoreDiff > 0) {
                targetMentality = 1; 
                reason = "On ferme la boutique.";
            }
        } 
        // 2. LOGIQUE DE GESTION (60e - 79e)
        else if (minute >= 60) {
            if (scoreDiff >= 2) {
                targetMentality = 2; 
                reason = "Gestion de l'avance.";
            } else if (scoreDiff <= -2) {
                targetMentality = 4; 
                reason = "On pousse pour revenir !";
            }
        }

        // 3. LOGIQUE DE SURCHAUFFE (Rupture Structurelle)
        if (teamFloor < 1.8 || avgSaturation > 4) {
            const recoveryMentality = 2;
            if (currentMentality > recoveryMentality) {
                targetMentality = recoveryMentality;
                reason = "Fatigue critique, baisse d'intensité.";
            }
        }

        if (targetMentality !== currentMentality) {
            const label = ["", "Très Défensif", "Prudent", "Équilibré", "Offensif", "Très Offensif"][targetMentality];
            const msg = `[COACH AI] Changement de mentalité : ${label} (${reason})`;
            log?.(`    ${msg}`);
            return { mentality: targetMentality, reason: msg };
        }

        return {};
    }

    /**
     * Gère les décisions de remplacements tactiques et forcés
     */
    static decideSubstitutions(
        minute: number,
        starters: any[], 
        subs: any[],
        coach: CoachMatchData | undefined,
        used: number,
        slots: number,
        teamId: number,
        myScore: number,
        oppScore: number,
        unavailablePlayers: Set<number>,
        sentOffPlayers: Set<number>,
        log?: (msg: string) => void
    ): SubstitutionResult {
        let currentUsed = used;
        let currentSlots = slots;
        const events: MatchEvent[] = [];
        let hasMadeChangeThisMinute = false;
        const strategy = coach?.preferredStrategy || "BALANCED";

        // 1. GESTION DES JOUEURS INDISPONIBLES (Blessures/Rouges)
        for (let i = 0; i < starters.length; i++) {
            const p = starters[i];
            if (!p) continue;

            if (unavailablePlayers.has(p.id!)) {
                if (sentOffPlayers.has(p.id!)) {
                } else if (currentUsed < 5 && subs.length > 0) {
                    const subIdx = this.findBestReplacement(p, subs, myScore - oppScore, strategy);
                    
                    if (subIdx !== -1) {
                        const fresh = subs.splice(subIdx, 1)[0];
                        fresh.entryMinute = minute; 
                        starters[i] = fresh;
                        events.push({ 
                            minute, type: "SPECIAL", teamId, 
                            description: `🔄 ${fresh.lastName} remplace ${p.lastName} (blessure)` 
                        });
                        currentUsed++;
                        if (minute !== 45 && !hasMadeChangeThisMinute) {
                            currentSlots++;
                            hasMadeChangeThisMinute = true;
                        }
                    }
                }
            }
        }

        // 2. LOGIQUE TACTIQUE
        const isHalfTime = minute === 45;
        let isTacticalWindow = false;
        if (strategy === "OFFENSIVE") isTacticalWindow = [55, 65, 75, 85].includes(minute);
        else if (strategy === "DEFENSIVE") isTacticalWindow = [75, 80, 85].includes(minute);
        else isTacticalWindow = [60, 70, 80].includes(minute);

        const canMakeTacticalSub = (isHalfTime || (isTacticalWindow && currentSlots < 3)) && currentUsed < 5;

        if (canMakeTacticalSub && !hasMadeChangeThisMinute) {
            const fatigueThreshold = 60; 

            const candidates = starters
                .map((p, index) => ({ p, index, energy: p.v_dyn ?? p.energy }))
                .filter(({ p }) => {
                    if (p.entryMinute && (minute - p.entryMinute < 30)) return false;
                    if (p.pos === "GK" || p.position === "GK") return false;
                    if (unavailablePlayers.has(p.id)) return false;
                    return true;
                })
                .sort((a, b) => a.energy - b.energy);

            if (candidates.length > 0 && candidates[0].energy < fatigueThreshold) {
                const { p: tired, index } = candidates[0];
                const subIdx = this.findBestReplacement(tired, subs, myScore - oppScore, strategy);
                
                if (subIdx !== -1 && subs[subIdx]) {
                    const fresh = subs.splice(subIdx, 1)[0];
                    fresh.entryMinute = minute; 
                    starters[index] = fresh;
                    events.push({ minute, type: "SPECIAL", teamId, description: `🔄 ${fresh.lastName} remplace ${tired.lastName} (tactique)` });
                    currentUsed++;
                    if (!isHalfTime) {
                        currentSlots++;
                        hasMadeChangeThisMinute = true;
                    }
                }
            }
        }

        return { used: currentUsed, slots: currentSlots, events };
    }

    private static findBestReplacement(outPlayer: any, subs: any[], scoreDiff: number, strategy: StrategyType): number {
        if (subs.length === 0) return -1;
        let targetPos = outPlayer.pos || outPlayer.position;
        
        if (strategy === "OFFENSIVE" && scoreDiff < 0 && targetPos === "DEF") {
             let offensiveIdx = subs.findIndex(s => (s.pos || s.position) === "FWD");
             if (offensiveIdx === -1) offensiveIdx = subs.findIndex(s => (s.pos || s.position) === "MID");
             if (offensiveIdx !== -1) return offensiveIdx;
        }

        let bestIdx = subs.findIndex(s => (s.pos || s.position) === targetPos);
        
        if (bestIdx === -1) {
            if (targetPos === "DEF") bestIdx = subs.findIndex(s => (s.pos || s.position) === "MID");
            else if (targetPos === "MID") bestIdx = subs.findIndex(s => (s.pos || s.position) === "FWD");
            else if (targetPos === "FWD") bestIdx = subs.findIndex(s => (s.pos || s.position) === "MID");
        }

        if (bestIdx === -1) bestIdx = subs.findIndex(s => (s.pos || s.position) !== "GK");
        
        return bestIdx;
    }
}
