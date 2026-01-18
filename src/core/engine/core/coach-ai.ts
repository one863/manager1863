import type { Player } from "@/core/db/db";
import { getFatiguePenalty } from "./probabilities";
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
     * Gère les décisions de remplacements tactiques et forcés
     */
    static decideSubstitutions(
        minute: number,
        starters: Player[],
        subs: Player[],
        coach: CoachMatchData | undefined,
        used: number,
        slots: number,
        teamId: number,
        myScore: number,
        oppScore: number,
        unavailablePlayers: Set<number>,
        sentOffPlayers: Set<number>
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
                    starters.splice(i, 1);
                    i--;
                } else if (currentUsed < 5 && subs.length > 0) {
                    const subIdx = this.findBestReplacement(p, subs, myScore - oppScore, strategy, coach?.tactical || 10, false);
                    const fresh = subs.splice(subIdx, 1)[0];
                    starters[i] = fresh;
                    events.push({ 
                        minute, 
                        type: "SPECIAL", 
                        teamId, 
                        description: `🔄 ${fresh.lastName} remplace ${p.lastName} (blessure)` 
                    });
                    currentUsed++;
                    if (minute !== 45 && !hasMadeChangeThisMinute) {
                        currentSlots++;
                        hasMadeChangeThisMinute = true;
                    }
                } else {
                    starters.splice(i, 1);
                    i--;
                }
            }
        }

        // 2. LOGIQUE TACTIQUE
        const isHalfTime = minute === 45;
        
        // Fenêtres tactiques selon la stratégie
        let isTacticalWindow = false;
        if (strategy === "OFFENSIVE") isTacticalWindow = [55, 65, 75, 85].includes(minute);
        else if (strategy === "DEFENSIVE") isTacticalWindow = [75, 80, 85].includes(minute);
        else isTacticalWindow = [60, 70, 80].includes(minute);

        const canMakeTacticalSub = (isHalfTime || (isTacticalWindow && currentSlots < 3)) && currentUsed < 5;
        const hasTension = Math.abs(myScore - oppScore) <= 1 && minute >= 75;

        if (canMakeTacticalSub && !hasMadeChangeThisMinute) {
            const managementBonus = coach ? (coach.management / 4) : 2.5;
            const fatigueThreshold = 50 + managementBonus; 

            // Tri des candidats : on ajuste la perception de la fatigue selon la tension et les traits
            const candidates = starters
                .map((p, index) => {
                    let effectiveEnergy = p.energy;
                    if (hasTension) {
                        if (p.traits?.includes("BIG_MATCH_PLAYER")) effectiveEnergy += 15;
                        if (p.age > 30) effectiveEnergy += 10; // Expérience
                    }
                    return { p, index, effectiveEnergy };
                })
                .filter(({ p }) => p.position !== "GK")
                .sort((a, b) => a.effectiveEnergy - b.effectiveEnergy);

            if (candidates.length > 0 && candidates[0].p.energy < fatigueThreshold) {
                const { p: tired, index } = candidates[0];
                const subIdx = this.findBestReplacement(tired, subs, myScore - oppScore, strategy, coach?.tactical || 10, hasTension);
                
                if (subIdx !== -1 && subs[subIdx]) {
                    const fresh = subs.splice(subIdx, 1)[0];
                    starters[index] = fresh;
                    
                    // Narration contextuelle
                    let logMsg = `🔄 ${fresh.lastName} remplace ${tired.lastName}`;
                    if (strategy === "OFFENSIVE" && (myScore <= oppScore) && fresh.position === "FWD") {
                        logMsg = `🔄 Changement offensif : ${fresh.lastName} entre pour forcer la décision`;
                    } else if (strategy === "DEFENSIVE" && (myScore > oppScore) && fresh.position === "DEF") {
                        logMsg = `🔄 Changement défensif : ${fresh.lastName} entre pour verrouiller le score`;
                    }

                    events.push({ minute, type: "SPECIAL", teamId, description: logMsg });
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

    /**
     * Choisit le meilleur profil sur le banc selon le score et la stratégie
     */
    private static findBestReplacement(
        outPlayer: Player, 
        subs: Player[], 
        scoreDiff: number, 
        strategy: StrategyType,
        tacticalSkill: number,
        hasTension: boolean
    ): number {
        if (subs.length === 0) return -1;

        // 1. Priorité Tension : Chercher un profil d'expérience ou clutch
        if (hasTension) {
            const clutchIdx = subs.findIndex(s => s.traits?.includes("BIG_MATCH_PLAYER"));
            if (clutchIdx !== -1) return clutchIdx;
            const veteranIdx = subs.findIndex(s => s.age > 30 && s.skill > 10);
            if (veteranIdx !== -1) return veteranIdx;
        }

        // 2. Logique de profil selon la stratégie et le score
        let targetPos = outPlayer.position;

        if (strategy === "OFFENSIVE" && scoreDiff <= 0) {
            // Un coach offensif sort un défenseur pour un attaquant s'il ne gagne pas
            if (outPlayer.position === "DEF" || outPlayer.position === "MID") targetPos = "FWD";
        } else if (strategy === "DEFENSIVE" && scoreDiff > 0) {
            // Un coach défensif sort un attaquant pour un défenseur dès qu'il mène
            if (outPlayer.position === "FWD" || outPlayer.position === "MID") targetPos = "DEF";
        }

        // 3. Subtilité Tactique (Coach expert)
        // Si tacticalSkill est haut, il peut décider de remplacer un attaquant par un milieu créatif pour tenir le ballon
        if (tacticalSkill > 15 && outPlayer.position === "FWD" && scoreDiff > 0) {
            const creativeMid = subs.findIndex(s => s.position === "MID" && s.stats.creation > 14);
            if (creativeMid !== -1) return creativeMid;
        }

        // 4. Recherche effective
        let bestIdx = subs.findIndex(s => s.position === targetPos);
        
        // Fallback poste pour poste si la cible tactique n'est pas dispo
        if (bestIdx === -1) {
            bestIdx = subs.findIndex(s => s.position === outPlayer.position);
        }

        // Fallback ultime : meilleur joueur restant
        if (bestIdx === -1) {
            bestIdx = subs.reduce((best, curr, idx) => 
                curr.skill > subs[best].skill ? idx : best, 0);
        }

        return bestIdx;
    }
}
