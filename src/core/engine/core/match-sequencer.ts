import { clamp, randomInt } from "@/core/utils/math";
import { CoachAI } from "./coach-ai";
import { D20, D100, weightedPick } from "./probabilities";
import { handleResolution, handleSetPiece, type TeamState, type PlayerState } from "./match-actions";
import { FORMATION_POSITIONS, ROLE_ZONE_INFLUENCE, PITCH_GRID } from "./tactics";
import type { Player } from "@/core/db/db";
import type { MatchResult, PlayerMatchStats, TacticType, FormationKey, MatchEventType } from "./types";

export interface StaffImpact {
    coaching: number; tactical: number; reading: number; recovery: number; conditioning: number;
    psychology?: number; medicine?: number; discipline?: number;
}

/**
 * MOTEUR V9.2 (Finalisation de la Fluidité)
 * - V9.1 : Intégration du module Mentalité (1-5) et Érosion.
 * - V9.2 : Propulsion Diagonale, Fatigue Défensive Dynamique, Équilibrage xG.
 */
export class MatchSequencer {
    private home: TeamState;
    private away: TeamState;
    private result: MatchResult;
    private currentMin = 0;
    private currentTotalMinutes = 90;
    
    private debugEnabled = false;
    private addedTimeSeconds = 0;
    private allParticipants = new Map<number, PlayerState>();
    
    private ballZone: number = 13; 
    private possessionTeamId: number;
    private possessionPlayerId: number | null = null;
    private isBallDead: boolean = true; 
    private pendingChanges: Map<number, { tactic?: TacticType, intensity?: number, formation?: FormationKey, mentality?: number }> = new Map();

    private zoneHeatmap: { home: { att: number[], def: number[] }, away: { att: number[], def: number[] } } = { 
        home: { att: new Array(30).fill(3.0), def: new Array(30).fill(3.0) }, 
        away: { att: new Array(30).fill(3.0), def: new Array(30).fill(3.0) } 
    };
    private isInfluenceDirty = true;

    private zoneSaturationIndex: number[] = new Array(30).fill(0);
    private stagnationZone: number = -1;
    private stagnationCount: number = 0;
    private wingAttackActive: boolean = false;
    private fastBreakCycles: number = 0;
    private lastActionWasRepiquage: boolean = false;

    // V9.1 - Érosion et Mentalité
    private teamFloors: Map<number, number> = new Map();
    private fastBreakDanger: boolean = false;
    
    constructor(
        homePlayers: Player[], awayPlayers: Player[], 
        homeName: string, awayName: string,
        homeId: number, awayId: number,
        hStaff: StaffImpact, aStaff: StaffImpact,
        hInt = 3, aInt = 3,
        hTactic: TacticType = "NORMAL", aTactic: TacticType = "NORMAL",
        hCohesion = 50, aCohesion = 50,
        hMentality = 3, aMentality = 3
    ) {
        this.result = this.initResult();
        this.home = this.initTeam(homeId, homeName, homePlayers, hStaff, hInt, hTactic, hCohesion, hMentality);
        this.away = this.initTeam(awayId, awayName, awayPlayers, aStaff, aInt, aTactic, aCohesion, aMentality);
        this.possessionTeamId = homeId;

        this.teamFloors.set(homeId, 3.0);
        this.teamFloors.set(awayId, 3.0);

        [...this.home.starters, ...this.away.starters].forEach(p => {
            this.allParticipants.set(p.id, p);
            this.result.playerStats![p.id.toString()] = this.initPlayerStats();
        });
    }

    public async run(): Promise<MatchResult> {
        while (this.tick()) {
            // Simulation pas à pas
        }
        return this.result;
    }

    public enableDebug() { this.debugEnabled = true; this.result.debugLogs = []; }
    private log(msg: string) { if (this.debugEnabled) this.result.debugLogs?.push(msg); }

    private getProgressionCol(zone: number): number { return Math.floor((zone - 1) / 5) + 1; }
    private getLineRow(zone: number): number { return ((zone - 1) % 5) + 1; }

    private getIntensityImpact(mentality: number) {
        const multipliers: Record<number, { force: number, erosion: number, risk: number, xgBonus: number }> = {
            1: { force: 0.80, erosion: 0.0, risk: 0.5, xgBonus: -0.05 },
            2: { force: 0.90, erosion: 0.0, risk: 0.7, xgBonus: -0.02 },
            3: { force: 1.00, erosion: 0.0, risk: 1.0, xgBonus: 0.0 },
            4: { force: 1.15, erosion: 0.0, risk: 1.5, xgBonus: 0.02 },
            5: { force: 1.30, erosion: 0.1, risk: 2.2, xgBonus: 0.05 }
        };
        return multipliers[mentality] || multipliers[3];
    }

    private getZoneFullLabel(zone: number, teamId: number): string {
        const isHome = teamId === this.home.id;
        const col = this.getProgressionCol(zone);
        const relCol = isHome ? col : 7 - col;
        const labels = ["Défense", "Sortie", "Milieu Propre", "Milieu Adverse", "Approche", "Finition"];
        const line = this.getLineRow(zone);
        const lineLabels = ["Aile G", "Int G", "Axe", "Int D", "Aile D"];
        return `${labels[relCol-1] || "Ext"} [${lineLabels[line-1]}] (Z${zone})`;
    }

    public tick(): boolean {
        if (this.currentMin > this.currentTotalMinutes) return false;
        const min = this.currentMin;
        
        if (this.isBallDead) { this.applyPendingChanges(); this.isBallDead = false; }
        if (this.isInfluenceDirty) { this.refreshInfluenceMaps(); this.isInfluenceDirty = false; }
        
        if (min > 0) this.zoneSaturationIndex = this.zoneSaturationIndex.map(v => Math.max(0, v - 0.5));

        // V9.1 - Erosion optimisée
        [this.home, this.away].forEach(team => {
            const impact = this.getIntensityImpact(team.mentality || 3);
            if (impact.erosion > 0) {
                const oppScore = team.id === this.home.id ? this.result.awayScore : this.result.homeScore;
                const myScore = team.id === this.home.id ? this.result.homeScore : this.result.awayScore;
                const erosionRate = myScore < oppScore ? impact.erosion : impact.erosion / 2;
                
                const currentFloor = this.teamFloors.get(team.id) || 3.0;
                this.teamFloors.set(team.id, Math.max(1.0, currentFloor - erosionRate));
            }
        });

        // COACH AI - Decisions tactiques (chaque minute)
        const avgSaturation = this.zoneSaturationIndex.reduce((a, b) => a + b, 0) / 30;
        
        const homeDecision = CoachAI.decideTactics(min, this.home.id, this.result.homeScore, this.result.awayScore, this.home.mentality, this.teamFloors.get(this.home.id) || 3.0, avgSaturation, this.home.staff as any, (m) => this.log(`[${this.home.name}] ${m}`));
        if (homeDecision.mentality) {
            this.updateMentality(this.home.id, homeDecision.mentality);
            if (homeDecision.reason) {
                this.result.events.push({ minute: min, type: "SPECIAL", teamId: this.home.id, description: `[IA] ${homeDecision.reason}` });
            }
        }

        const awayDecision = CoachAI.decideTactics(min, this.away.id, this.result.awayScore, this.result.homeScore, this.away.mentality, this.teamFloors.get(this.away.id) || 3.0, avgSaturation, this.away.staff as any, (m) => this.log(`[${this.away.name}] ${m}`));
        if (awayDecision.mentality) {
            this.updateMentality(this.away.id, awayDecision.mentality);
            if (awayDecision.reason) {
                this.result.events.push({ minute: min, type: "SPECIAL", teamId: this.away.id, description: `[IA] ${awayDecision.reason}` });
            }
        }

        if (min === 0) {
            this.log("====================================================");
            this.log("=== ENGINE V9.2 (FLUIDITY FINAL) ACTIVATED ===");
            this.log("====================================================");
            this.result.ballHistory![0] = 13;
            this.result.events.push({ minute: 0, type: "SPECIAL", teamId: this.home.id, description: "Coup d'envoi !" });
        }

        const hG = this.result.homeScore, aG = this.result.awayScore;

        for (let cycle = 0; cycle < 4; cycle++) {
            if (this.isBallDead) break;
            this.result.ballHistory![min] = this.ballZone;
            const stop = this.playMicroCycle(min, cycle * 15);
            
            if (this.result.homeScore > hG || this.result.awayScore > aG) {
                const concedingTeamId = this.result.homeScore > hG ? this.away.id : this.home.id;
                this.possessionTeamId = concedingTeamId;
                this.isBallDead = true; 
                this.ballZone = 13; 
                this.possessionPlayerId = null;
                this.fastBreakCycles = 0;
                this.wingAttackActive = false;
                this.stagnationCount = 0;
                this.fastBreakDanger = false;
                this.log(`    -> [Engagement] Retour au rond central pour ${this.possessionTeamId === this.home.id ? this.home.name : this.away.name}.`);
                break;
            }
            if (stop) { this.isBallDead = true; break; }
        }

        if (min === 90) {
            const extra = Math.max(1, Math.min(10, Math.ceil(this.addedTimeSeconds / 60)));
            this.currentTotalMinutes = 90 + extra;
            this.result.events.push({ minute: 90, type: "SPECIAL", teamId: this.home.id, description: `Temps additionnel : +${extra} min` });
        }
        
        if (this.currentMin >= this.currentTotalMinutes) { this.finalizeMatch(); return false; }
        this.currentMin++;
        return true;
    }

    private playMicroCycle(min: number, sec: number): boolean {
        const att = this.possessionTeamId === this.home.id ? this.home : this.away;
        const def = this.possessionTeamId === this.home.id ? this.away : this.home;
        const isHome = att.id === this.home.id;
        
        let carrier = this.getPlayerInZone(att, this.ballZone);
        if (!carrier || (carrier.pos === "GK" && !this.isInGKZone(this.ballZone, isHome))) {
            carrier = att.starters.find(p => p.pos !== "GK" && (p as any).assignedZone === this.ballZone) || att.starters.find(p => p.pos !== "GK")!;
        }

        const col = this.getProgressionCol(this.ballZone);
        const relCol = isHome ? col : 7 - col;

        if (carrier.pos === "GK") {
            this.log(`    -> [GK] ${carrier.lastName} relance.`);
            this.handleEmergencyExit(isHome);
            return false;
        }

        this.possessionPlayerId = carrier.id;
        const zIdx = this.ballZone - 1;
        const line = this.getLineRow(this.ballZone);

        const attFloor = this.teamFloors.get(att.id) || 3.0;
        const saturationIncrement = attFloor < 2.0 ? 2.0 : 1.0;
        this.zoneSaturationIndex[zIdx] += saturationIncrement;

        if (this.ballZone === this.stagnationZone) this.stagnationCount++;
        else { this.stagnationZone = this.ballZone; this.stagnationCount = 0; }

        let stagnationThreshold = (relCol === 2) ? 5 : 3;
        if (min >= 85 && Math.abs(this.result.homeScore - this.result.awayScore) <= 1) stagnationThreshold = 2;

        if (this.stagnationCount >= stagnationThreshold) {
            this.log(`    [ANTI-LOOP] Stagnation en ${zIdx+1}. Sortie de zone forcée.`);
            this.handleEmergencyExit(isHome);
            this.stagnationCount = 0;
            return false;
        }

        const friction = this.zoneSaturationIndex[zIdx] >= 3 ? 0.4 : 1.0;
        if (this.fastBreakCycles > 0) this.fastBreakCycles--;
        
        let posPenalty = 1.0;
        if (this.fastBreakCycles === 0) {
            if (carrier.pos === "DEF" && relCol > 4) posPenalty = 0.2;
            if (carrier.pos === "MID" && (relCol < 2 || relCol > 5)) posPenalty = 0.2;
            if (carrier.pos === "FWD" && relCol < 4) posPenalty = 0.2;
        }

        const attImpact = this.getIntensityImpact(att.mentality || 3);
        const defImpact = this.getIntensityImpact(def.mentality || 3);

        let aPow = (isHome ? this.zoneHeatmap.home.att[zIdx] : this.zoneHeatmap.away.att[zIdx]) * friction * posPenalty * attImpact.force;
        let dPow = (isHome ? this.zoneHeatmap.away.def[zIdx] : this.zoneHeatmap.home.def[zIdx]) * defImpact.force;
        
        // V9.2 - Fatigue Défensive Dynamique
        // Si la zone est très saturée (col 1 ou 2), le défenseur subit une pénalité
        if (relCol <= 2 && this.zoneSaturationIndex[zIdx] >= 5) {
            dPow *= 0.80; // -20%
            if (sec === 0) this.log(`    -> [FATIGUE DEF] Saturation critique en Z${zIdx+1}, défense sous pression (-20%).`);
        }
        else if (this.zoneSaturationIndex[zIdx] > 4) {
            dPow *= 0.9;
            if (sec === 0) this.log(`    -> [DEF TOURNIS] Saturation élevée en Z${zIdx+1}, la défense perd en lucidité.`);
        }

        // V9.2.1 - Bonus Fast Break à +25% (au lieu de +40%)
        if (this.fastBreakDanger && this.fastBreakCycles > 0) {
            aPow *= 1.25;
        }

        if ((line === 1 || line === 5) && this.zoneSaturationIndex[zIdx] >= 2) aPow *= 1.5;
        if (line === 3 && att.starters.filter(p => (p as any).assignedZone === this.ballZone).length > 3) aPow *= 0.7;

        aPow += D20(); dPow += D20();

        if (aPow > dPow) {
            const isShooting = relCol >= 5;
            if (line === 1 || line === 5) this.wingAttackActive = true;

            if (relCol === 5 && (line === 1 || line === 5) && (carrier.pos === "MID" || carrier.pos === "FWD")) {
                if (D100() < 60) {
                    this.log(`    -> [Repiquage] ${carrier.lastName} (${carrier.pos}) rentre dans l'axe.`);
                    this.ballZone = this.ballZone + (line === 1 ? 2 : -2);
                    this.lastActionWasRepiquage = true;
                    return false;
                }
            }

            if (D100() < (relCol >= 6 ? 90 : (isShooting ? 35 : 0))) {
                const xgMultiplier = this.lastActionWasRepiquage ? 1.2 : 1.0;
                let xgFinalBoost = attImpact.xgBonus;
                
                // V9.2 - Équilibrage du xG par zone
                // Axe Central (Z28 - ligne 3, col 6 en absolu ou relatif ?)
                // Les zones de finition sont col 6.
                // En relatif : col 6.
                // Ligne : 1=AileG, 2=IntG, 3=Axe, 4=IntD, 5=AileD
                if (relCol === 6) {
                    if (line === 3) xgFinalBoost += 0.30;
                    else if (line === 2 || line === 4) xgFinalBoost += 0.20;
                    else xgFinalBoost += 0.10;
                }

                if (att.mentality === 5 && this.zoneSaturationIndex[zIdx] >= 2) {
                    xgFinalBoost += 0.02; 
                }
                
                handleResolution(min, att, def, this.result, false, this.home.id, xgFinalBoost, (m) => this.log(`    ${m}`), this.ballZone, this.zoneSaturationIndex[zIdx] / xgMultiplier);
                this.wingAttackActive = false;
                this.lastActionWasRepiquage = false;
                return true; 
            }

            this.lastActionWasRepiquage = false;
            if (D100() < 75) this.moveBallForward(isHome); else this.moveBallLateral();
            this.log(`    [${min}:${sec}] Progression de ${carrier.lastName} (${carrier.pos}) -> ${this.getZoneFullLabel(this.ballZone, att.id)}`);
            return false;
        } else {
            if (attImpact.force >= 1.15) { 
                this.fastBreakDanger = true;
                this.fastBreakCycles = 3;
                this.log(`    -> [DANGER] Contre-attaque rapide activée !`);
            } else if (relCol <= 2 && friction < 1.0) {
                this.fastBreakCycles = 2;
                this.log(`    -> [Fast-Break] Relance rapide !`);
            }
            this.possessionTeamId = def.id;
            this.wingAttackActive = false;
            this.lastActionWasRepiquage = false;
            this.log(`    [${min}:${sec}] Turnover de ${carrier.lastName} (${carrier.pos}) en Z${zIdx+1}.`);
            return D100() < 15; 
        }
    }

    private refreshInfluenceMaps() {
        this.zoneHeatmap.home.att.fill(3.0); this.zoneHeatmap.home.def.fill(3.0);
        this.zoneHeatmap.away.att.fill(3.0); this.zoneHeatmap.away.def.fill(3.0);
        const apply = (team: TeamState, map: { att: number[], def: number[] }, isHome: boolean) => {
            team.starters.forEach(p => {
                const az = (p as any).assignedZone;
                if (!az) return;
                let z = isHome ? az : 31 - az;
                const idx = z - 1;
                const attR = (p.stats.passing + p.stats.dribbling + p.stats.vision) / 3;
                const defR = (p.stats.tackling + p.stats.strength + p.stats.positioning) / 3;
                if (p.pos === "GK") map.def[idx] += (p.stats.goalkeeping || 10);
                else { map.att[idx] += attR; map.def[idx] += defR; }
                [idx-1, idx+1, idx-5, idx+5].forEach(n => {
                    if (n >= 0 && n < 30) { map.att[n] += attR * 0.4; map.def[n] += defR * 0.4; }
                });
            });
        };
        apply(this.home, this.zoneHeatmap.home, true);
        apply(this.away, this.zoneHeatmap.away, false);
    }

    private getPlayerInZone(team: TeamState, zone: number): PlayerState | null {
        const isHome = team.id === this.home.id;
        const target = isHome ? zone : 31 - zone;
        const tRow = Math.floor((target - 1) / 5), tCol = (target - 1) % 5;
        let best: PlayerState | null = null;
        let minDist = 99;
        team.starters.forEach(p => {
            const pz = (p as any).assignedZone || 13;
            const dist = Math.abs(tRow - Math.floor((pz-1)/5)) + Math.abs(tCol - ((pz-1)%5));
            if (dist < minDist) { minDist = dist; best = p; }
        });
        return best;
    }

    private isInGKZone(zone: number, isHome: boolean): boolean {
        const col = this.getProgressionCol(zone);
        return isHome ? col === 1 : col === 6;
    }

    private handleEmergencyExit(isHome: boolean) {
        const col = this.getProgressionCol(this.ballZone);
        const relCol = isHome ? col : 7 - col;
        const saturation = this.zoneSaturationIndex[this.ballZone - 1] || 0;

        // V9.2 - Propulsion Diagonale (Hard Reset)
        // Vérification des ailes saturées (Ligne 1 ou 5)
        const currentLine = this.getLineRow(this.ballZone);
        const currentRow = Math.floor((this.ballZone - 1) / 5);
        
        // Si les deux ailes sont saturées (condition simplifiée ici : si la zone actuelle est une aile et saturée)
        // Pour être plus précis avec la logique "si les deux ailes atteignent un index > 3", 
        // il faudrait vérifier toutes les zones.
        // Ici on simplifie : si on est coincé sur une aile et qu'elle est saturée > 3, on propulse au centre.
        if ((currentLine === 1 || currentLine === 5) && saturation > 3) {
            // Cible : Colonne 5 centrale (Zone 23 ou 18 selon le sens ?)
            // Zone 23 est ligne 3, col 5 (zones 21-25) -> C'est zone offensive pour Home (21,22,23,24,25)
            // Zone 18 est ligne 3, col 4 (zones 16-20)
            
            // Pour faire simple : on vise la zone centrale de la colonne 5 (Zone 23) si on est Home
            // Zone 23 = (4 * 5) + 3 = 23.
            // Si on est Away, on vise la symétrie.
            
            this.log(`    -> [PROPULSION DIAGONALE] Ailes saturées, dégagement axial !`);
            if (isHome) {
                this.ballZone = 23; // Centre colonne 5
            } else {
                this.ballZone = 8; // (31 - 23) = 8.
            }
            return;
        }

        if (relCol <= 2 || saturation >= 5) {
            const jump = saturation >= 5 ? 2 : 0;
            this.log(`    -> [PROPULSION] Sortie de zone critique (Jump: ${jump}).`);
            
            const row = Math.floor((this.ballZone - 1) / 5);
            this.ballZone = (row * 5) + (this.getLineRow(this.ballZone) <= 2 ? 5 : 1);
            
            for(let i=0; i < (1 + jump); i++) this.moveBallForward(isHome);
            return;
        }
        
        const dist = randomInt(2, 3);
        for(let i=0; i<dist; i++) this.moveBallForward(isHome);
    }

    private moveBallForward(isHome: boolean) {
        const row = Math.floor((this.ballZone - 1) / 5);
        const col = (this.ballZone - 1) % 5;
        if (isHome && row < 5) this.ballZone = ((row + 1) * 5) + clamp(col + randomInt(-1, 1), 0, 4) + 1;
        else if (!isHome && row > 0) this.ballZone = ((row - 1) * 5) + clamp(col + randomInt(-1, 1), 0, 4) + 1;
    }

    private moveBallLateral() {
        const row = Math.floor((this.ballZone - 1) / 5);
        const col = (this.ballZone - 1) % 5;
        this.ballZone = (row * 5) + clamp(col + (randomInt(0, 1) ? 1 : -1), 0, 4) + 1;
    }

    private finalizeMatch() {
        const hA = this.zoneHeatmap.home.att.reduce((a,b)=>a+b, 0), aA = this.zoneHeatmap.away.att.reduce((a,b)=>a+b, 0);
        this.result.homePossession = clamp(Math.round((hA / (hA + aA || 1)) * 100), 20, 80);
        this.result.heatmap = { home: [...this.zoneHeatmap.home.att], away: [...this.zoneHeatmap.away.att] };
        this.log(`=== SCORE FINAL : ${this.home.name} ${this.result.homeScore} - ${this.result.awayScore} ${this.away.name} ===`);
    }

    private initTeam(id: number, name: string, ps: Player[], staff: StaffImpact, intensity: number, tactic: TacticType, cohesion: number, mentality: number): TeamState & { formation: FormationKey, mentality: number } {
        const formation = (ps[0] as any)?.teamFormation || "4-4-2";
        const pos = FORMATION_POSITIONS[formation as FormationKey] || FORMATION_POSITIONS["4-4-2"];
        return {
            id, name, intensity, formation, staff, cohesion, tactic, mentality, subsUsed: 0, subsSlots: 0, sectorStats: { midfield: 0, defense: 0, attackLeft: 0, attackRight: 0, attackCenter: 0 },
            starters: ps.filter(p => p.isStarter).slice(0, 11).map((p, i) => ({
                id: p.id!, lastName: p.lastName, pos: p.position, side: (p.side as any) || "C", role: "None", assignedZone: pos[i], traits: p.traits, v_dyn: 100, confidence: 0, 
                stats: { ...p.stats, goalkeeping: p.stats.goalkeeping || 10 }, 
                perf: { q_pass: p.stats.passing, q_shoot: p.stats.shooting, q_tackle: p.stats.tackling, n_vis: p.stats.vision, n_pla: p.stats.positioning, n_com: p.stats.composure, v_spd: p.stats.speed, n_ant: p.stats.anticipation || 10 },
                entryMinute: 0
            } as any)),
            subs: ps.filter(p => !p.isStarter).map(p => ({ ...p, pos: p.position, v_dyn: 100, id: p.id!, entryMinute: 0 }))
        } as any;
    }

    private updateTactic(teamId: number, tactic: TacticType) { this.getPending(teamId).tactic = tactic; this.isInfluenceDirty = true; }
    private updateIntensity(teamId: number, intensity: number) { this.getPending(teamId).intensity = intensity; }
    private updateMentality(teamId: number, mentality: number) { this.getPending(teamId).mentality = mentality; }
    private updateFormation(teamId: number, formation: FormationKey) { this.getPending(teamId).formation = formation; this.isInfluenceDirty = true; }

    private getPending(teamId: number) {
        if (!this.pendingChanges.has(teamId)) this.pendingChanges.set(teamId, {});
        return this.pendingChanges.get(teamId)!;
    }

    private applyPendingChanges() {
        this.pendingChanges.forEach((changes, teamId) => {
            const team = teamId === this.home.id ? this.home : this.away;
            if (changes.tactic) team.tactic = changes.tactic;
            if (changes.intensity) team.intensity = changes.intensity;
            if (changes.mentality) team.mentality = changes.mentality;
            if (changes.formation) {
                const positions = FORMATION_POSITIONS[changes.formation] || FORMATION_POSITIONS["4-4-2"];
                team.starters.forEach((p, i) => { if (positions[i]) (p as any).assignedZone = positions[i]; });
            }
        });
        this.pendingChanges.clear();
    }

    private initResult(): MatchResult {
        return { homeScore: 0, awayScore: 0, homePossession: 50, events: [], ballHistory: new Array(130).fill(13), stats: { homeChances: 0, awayChances: 0, homeShots: 0, awayShots: 0, homeShotsOnTarget: 0, awayShotsOnTarget: 0, homeXG: 0, awayXG: 0, homeXA: 0, awayXA: 0, homePPDA: 0, awayPPDA: 0, homePasses: 0, awayPasses: 0, homeDefensiveActions: 0, awayDefensiveActions: 0, homeDuelsWon: 0, awayDuelsWon: 0, homeDuelsTotal: 0, awayDuelsTotal: 0, homeDistance: 0, awayDistance: 0 }, playerStats: {}, playerUpdates: {} };
    }

    private initPlayerStats(): PlayerMatchStats {
        return { rating: 0, goals: 0, assists: 0, shots: 0, shotsOnTarget: 0, xg: 0, xa: 0, passes: 0, passesSuccess: 0, duels: 0, duelsWon: 0, distance: 0, sprints: 0, interventions: 0, saves: 0, ballsLost: 0 };
    }
}
