import { clamp, randomInt } from "@/core/utils/math";
import { D100, bradleyTerry, weightedPick } from "./probabilities";
import { handleResolution, handleSetPiece, type TeamState, type PlayerState } from "./match-actions";
import { CoachAI } from "./coach-ai";
import { getNarrative } from "@/core/generators/narratives";
import type { Player } from "@/core/db/db";
import type { MatchResult, MatchEvent, TacticType } from "./types";

export interface StaffImpact {
    coaching: number; tactical: number; recovery: number; conditioning: number; reading: number;
}

export class MatchSequencer {
    public home: TeamState;
    public away: TeamState;
    public result: MatchResult;
    public currentMin = 0;
    public currentSec = 0;
    private currentTickIndex = 0;
    private baseTicks = 180; 
    private stoppageTicks = 0; 
    
    private debugEnabled = false;
    private activePlayersIds = new Set<number>();
    
    public possessionTeamId: number;
    private momentum = 0; 
    private homePossessionTicks = 0;

    private unavailablePlayers = new Set<number>();
    private sentOffPlayers = new Set<number>();

    private pendingSetPiece: { type: "CORNER" | "FREE_KICK" | "PENALTY" | "LONG_THROW", attId: number } | null = null;
    private currentZone: number = 3; 
    private currentSubZone: "LEFT" | "CENTER" | "RIGHT" = "CENTER";

    private waitTicks = 0;
    private waitReason: string | null = null;
    private consecutiveConservation = 0;

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
        this.possessionTeamId = Math.random() > 0.5 ? homeId : awayId;

        [...this.home.starters, ...this.home.subs, ...this.away.starters, ...this.away.subs].forEach(p => {
            this.initPlayerStatsContainer(p.id);
            if (this.home.starters.find(s => s.id === p.id) || this.away.starters.find(s => s.id === p.id)) {
                this.activePlayersIds.add(p.id);
            }
        });
    }

    private initPlayerStatsContainer(playerId: number) {
        if (!this.result.playerStats![playerId.toString()]) {
            this.result.playerStats![playerId.toString()] = { 
                rating: 6.0, goals: 0, assists: 0, shots: 0, shotsOnTarget: 0, xg: 0, xa: 0, 
                passes: 0, passesSuccess: 0, duels: 0, duelsWon: 0, distance: 0, sprints: 0, 
                interventions: 0, saves: 0, ballsLost: 0, fatigue: 0,
                ratingHistory: [], fatigueHistory: [] 
            };
        }
    }

    public async run(): Promise<MatchResult> {
        while (this.currentTickIndex < (this.baseTicks + this.stoppageTicks)) {
            this.nextTick();
        }
        this.calculateFinalStats();
        return this.result;
    }

    public enableDebug() { 
        this.debugEnabled = true; 
        this.result.debugLogs = []; 
    }

    private log(tag: "DEBUG" | "MATH" | "AI" | "EVENT" | "STAT_END", msg: string) {
        if (this.debugEnabled) {
            const time = `[${this.currentMin.toString().padStart(2, '0')}:${this.currentSec.toString().padStart(2, '0')}]`;
            this.result.debugLogs?.push(`${time} [${tag}] ${msg}`);
        }
    }

    public nextTick(): MatchResult {
        const att = (this.possessionTeamId === this.home.id) ? this.home : this.away;
        const def = (this.possessionTeamId === this.home.id) ? this.away : this.home;

        if (this.possessionTeamId === this.home.id) this.homePossessionTicks++;
        this.result.homePossession = Math.round((this.homePossessionTicks / (this.currentTickIndex + 1)) * 100);
        this.momentum = (this.currentZone - 3) * 50;

        if (this.waitTicks > 0) {
            this.log("DEBUG", `[WAIT] ${this.waitReason} (${this.waitTicks} tick(s) restant(s))`);
            this.waitTicks--;
            this.updateRatings();
            this.advanceTime();
            return this.result;
        }

        if (this.pendingSetPiece) {
            const zTag = (this.currentZone === 1 || this.currentZone === 5) ? ` [${this.currentSubZone}]` : "";
            this.log("DEBUG", `[Z:${this.currentZone}]${zTag} Phase: CPA (${this.pendingSetPiece.type}) - ${att.name}`);
            const res = handleSetPiece(this.currentMin, att, def, this.result, this.home.id, (m) => this.log("MATH", m), this.pendingSetPiece.type, this.currentZone);
            
            if (res === "CORNER") {
                this.pendingSetPiece = { type: "CORNER", attId: att.id };
                this.setWait(1, "Préparation Corner", false);
            } else if (res === "GOAL") {
                this.pendingSetPiece = null;
                this.possessionTeamId = def.id;
                this.currentZone = 3; 
                this.setWait(2, "Célébration But", false);
            } else if (res === "SET_PIECE") {
                this.pendingSetPiece = null;
            } else {
                this.pendingSetPiece = null;
                this.possessionTeamId = def.id;
                this.currentZone = (def.id === this.home.id) ? 1 : 5; 
            }
        } else {
            this.playCycle(att, def);
        }

        this.updateRatings();
        if (this.result.ballHistory) this.result.ballHistory.push(this.momentum);
        if (this.result.possessionHistory) this.result.possessionHistory.push(this.possessionTeamId);
        this.advanceTime();
        return this.result;
    }

    private advanceTime() {
        if (this.currentSec === 30) { this.currentSec = 0; this.currentMin++; this.runEndOfMinuteLogic(); } else { this.currentSec = 30; }
        this.currentTickIndex++;
    }

    private setWait(ticks: number, reason: string, isStoppage: boolean) {
        this.waitTicks = ticks;
        this.waitReason = reason;
        if (isStoppage) this.stoppageTicks += ticks;
    }

    private playCycle(att: TeamState, def: TeamState) {
        const isHome = att.id === this.home.id;
        const direction = isHome ? 1 : -1;
        const targetBox = isHome ? 5 : 1;
        const myGoalZone = isHome ? 1 : 5;

        // 1. POSSESSION
        this.log("DEBUG", `[Z:${this.currentZone}] Phase 1: Possession - ${att.name}`);
        let attP = this.calculateTeamPower(att, "midfield");
        let defP = this.calculateTeamPower(def, "midfield");
        if (this.currentZone === myGoalZone) attP *= 1.3;

        const initProb = bradleyTerry(attP, defP);
        const successInit = D100() <= initProb * 100;
        this.addDuel(att, def, successInit);

        if (!successInit) {
            this.log("DEBUG", `[Z:${this.currentZone}] [MATH] Changement de possession.`);
            this.addPasses(att, randomInt(1, 3));
            this.possessionTeamId = def.id;
            this.consecutiveConservation = 0;
            if (this.currentZone === myGoalZone && D100() < 70) {
                this.log("DEBUG", `[Z:${this.currentZone}] [MATH] ${def.name} dégage vers le milieu.`);
                this.currentZone = 3;
            }
            if (D100() < 6) this.handleIncident(att, def, this.currentZone === 1 || this.currentZone === 5 ? "BOX" : "MIDFIELD");
            return;
        }

        // CONSERVATION
        const isOffensiveZone = isHome ? this.currentZone >= 4 : this.currentZone <= 2;
        const inMidfield = this.currentZone === 3;
        const isTikiTaka = att.tactic === "AIM";
        let conservationChance = inMidfield ? 60 : (isOffensiveZone ? 10 : 35); 
        if (!isTikiTaka && this.consecutiveConservation >= 2) conservationChance = 5; 

        if (D100() < conservationChance) {
            const pCount = randomInt(8, 14); 
            this.log("DEBUG", `[Z:${this.currentZone}] [MATH] ${att.name} fait circuler (${pCount} passes).`);
            this.addPasses(att, pCount);
            this.consecutiveConservation++;
            return; 
        }
        this.consecutiveConservation = 0;

        // 2. CONSTRUCTION
        if (this.currentZone !== targetBox) {
            this.log("DEBUG", `[Z:${this.currentZone}] Phase 2: Construction - ${att.name}`);
            this.currentSubZone = this.decideAttackLane(att);
            const attC = this.calculateLanePower(att, this.currentSubZone, "ATTACK");
            const defC = this.calculateLanePower(def, this.currentSubZone, "DEFENSE") * 1.05;
            const bonusProg = inMidfield ? 1.4 : 1.1; 
            const constProb = bradleyTerry(attC * bonusProg, defC);
            const successConst = D100() <= constProb * 100;
            this.addDuel(att, def, successConst);

            if (!successConst) {
                this.log("DEBUG", `[Z:${this.currentZone}] [MATH] Interception de ${def.name}.`);
                this.addPasses(att, randomInt(2, 4));
                this.possessionTeamId = def.id;
                if (this.currentZone === 3 && D100() < 40) {
                    this.currentZone -= direction;
                    this.log("DEBUG", `[Z:${this.currentZone}] [MATH] Contre-attaque éclair de ${def.name} !`);
                }
                return;
            }
            this.currentZone += direction;
            this.log("DEBUG", `[Z:${this.currentZone}] [MATH] Progression réussie`);
            this.addPasses(att, randomInt(4, 7));

            if (D100() < 20) {
                const r = D100();
                let type: any = (r < 35) ? "CORNER" : ((r < 50) ? "LONG_THROW" : "FREE_KICK");
                this.pendingSetPiece = { type, attId: att.id };
                if (type === "CORNER" || type === "PENALTY") this.currentZone = targetBox;
                this.setWait(1, "Préparation CPA", false);
                return;
            }
        }

        // 3. OCCASION (Grosse occasion si domination nette)
        if (this.currentZone === targetBox) {
            this.log("DEBUG", `[Z:${this.currentZone}] [${this.currentSubZone}] Phase 3: Occasion - ${att.name}`);
            const attO = this.calculateTeamPower(att, "attack");
            const defO = this.calculateTeamPower(def, "defense") * 1.1; 
            const occProb = bradleyTerry(attO, defO);
            const rollOcc = D100();
            const successOcc = rollOcc <= occProb * 100;
            this.addDuel(att, def, successOcc);

            if (!successOcc) {
                this.log("DEBUG", `[Z:${this.currentZone}] [${this.currentSubZone}] [MATH] Échec Test Occasion`);
                this.addPasses(att, randomInt(1, 3));
                this.possessionTeamId = def.id;
                return;
            }

            // Grosse Occasion (Big Chance) si le succès est éclatant (RNG très bas par rapport à Prob)
            const isBigChance = rollOcc < (occProb * 100 * 0.3); // 30% des occasions réussies sont des Big Chances
            if (isBigChance) this.log("DEBUG", `[Z:${this.currentZone}] [MATH] GROSSE OCCASION ! Le but est tout proche...`);

            // 4. FINITION
            this.log("DEBUG", `[Z:${this.currentZone}] [${this.currentSubZone}] Phase 4: Finition - ${att.name}`);
            const res = handleResolution(this.currentMin, att, def, this.result, false, this.home.id, undefined, (m) => this.log("MATH", m), false, false, isBigChance);
            
            if (res === "CORNER") {
                this.pendingSetPiece = { type: "CORNER", attId: att.id };
                this.currentZone = targetBox;
                this.setWait(1, "Préparation Corner", false);
            } else if (res === "GOAL") {
                this.possessionTeamId = def.id;
                this.currentZone = 3;
                this.setWait(2, "Célébration But", false);
            } else {
                this.possessionTeamId = def.id;
                this.currentZone = (def.id === this.home.id) ? 1 : 5; 
            }
        }
    }

    private addDuel(att: TeamState, def: TeamState, attWon: boolean) {
        const aIdx = randomInt(0, att.starters.length-1);
        const dIdx = randomInt(0, def.starters.length-1);
        const aId = att.starters[aIdx]?.id;
        const dId = def.starters[dIdx]?.id;
        if (aId) { const s = this.result.playerStats![aId.toString()]; if (s) { s.duels++; if (attWon) s.duelsWon++; } }
        if (dId) { const s = this.result.playerStats![dId.toString()]; if (s) { s.duels++; if (!attWon) s.duelsWon++; } }
        if (attWon) { if (att.id === this.home.id) this.result.stats.homeDuelsWon++; else this.result.stats.awayDuelsWon++; }
        else { if (def.id === this.home.id) this.result.stats.homeDuelsWon++; else this.result.stats.awayDuelsWon++; }
        this.result.stats.homeDuelsTotal++; this.result.stats.awayDuelsTotal++;
    }

    private addPasses(team: TeamState, count: number) {
        const ps = team.starters.filter(p => p.pos !== "GK");
        for(let i=0; i<count; i++) {
            const p = ps[randomInt(0, ps.length - 1)];
            if (p) { const s = this.result.playerStats![p.id.toString()]; if (s) { s.passes++; s.passesSuccess++; } }
        }
        if (team.id === this.home.id) this.result.stats.homePasses += count; else this.result.stats.awayPasses += count;
    }

    private handleIncident(att: TeamState, def: TeamState, zone: "MIDFIELD" | "BOX") {
        const player = att.starters[randomInt(0, att.starters.length - 1)];
        if (!player) return;
        const roll = D100();
        if (roll < 80) {
            const desc = getNarrative("match", "card", { player: player.lastName, team: att.name });
            this.result.events.push({ minute: this.currentMin, second: this.currentSec, type: "CARD", teamId: att.id, description: desc.content, playerId: player.id });
        } else if (roll < 95) {
            this.setWait(2, "Blessure", true);
            this.unavailablePlayers.add(player.id);
            const desc = getNarrative("match", "injury", { player: player.lastName });
            this.result.events.push({ minute: this.currentMin, type: "INJURY", teamId: att.id, description: desc.content, playerId: player.id });
        } else {
            this.sentOffPlayers.add(player.id);
            att.starters = att.starters.filter(p => p.id !== player.id);
            const desc = getNarrative("match", "red_card", { player: player.lastName, team: att.name });
            this.result.events.push({ minute: this.currentMin, second: this.currentSec, type: "CARD", teamId: att.id, description: desc.content, playerId: player.id });
            if (zone === "BOX" && D100() < 80) this.pendingSetPiece = { type: "PENALTY", attId: def.id };
        }
    }

    private runEndOfMinuteLogic() {
        [this.home, this.away].forEach(t => {
            const myScore = t.id === this.home.id ? this.result.homeScore : this.result.awayScore;
            const oppScore = t.id === this.home.id ? this.result.awayScore : this.result.homeScore;
            const decision = CoachAI.decideTactics(this.currentMin, t.id, myScore, oppScore, (t as any).mentality, 2.0, 0, (t as any).staff, (m) => this.log("AI", m));
            if (decision.mentality !== undefined) (t as any).mentality = decision.mentality;
            const subRes = CoachAI.decideSubstitutions(this.currentMin, t.starters, t.subs, (t as any).staff, (t as any).subsUsed || 0, (t as any).subsSlots || 0, t.id, myScore, oppScore, this.unavailablePlayers, this.sentOffPlayers, (m) => this.log("AI", m));
            if (subRes.events.length > 0) {
                this.setWait(1, "Changement", true);
                (t as any).subsUsed = subRes.used; (t as any).subsSlots = subRes.slots;
                this.result.events.push(...subRes.events);
            }
        });

        [this.home, this.away].forEach(t => {
            const intensityMult = (t as any).mentality / 3;
            t.starters.forEach(p => {
                const gain = 0.4 + (0.4 * intensityMult); 
                (p as any).fatigue = Math.min(100, ((p as any).fatigue || 0) + gain);
                const s = this.result.playerStats![p.id.toString()];
                if (s) s.fatigue = (p as any).fatigue;
            });
        });
    }

    private calculateLanePower(t: TeamState, l: any, type: any): number {
        const ps = t.starters.filter(p => (p as any).side === (l === "CENTER" ? "C" : (l === "LEFT" ? "L" : "R")));
        const basePower = ps.length === 0 ? this.calculateTeamPower(t, type === "ATTACK" ? "attack" : "defense") * 0.75 : ps.reduce((acc, p) => acc + (type === "ATTACK" ? ((p.perf?.dribbling || 10) + (p.perf?.passing || 10)) / 2 : ((p.perf?.tackling || 10) + (p.perf?.positioning || 10)) / 2), 0) / ps.length;
        const avgFatigue = ps.length === 0 ? 0 : ps.reduce((acc, p) => acc + ((p as any).fatigue || 0), 0) / ps.length;
        return basePower * this.getGeneralMultipliers(t) * (1 - (avgFatigue / 200));
    }

    private calculateTeamPower(t: TeamState, sector: any): number {
        if (t.starters.length === 0) return 1.0;
        let ps = t.starters;
        if (sector === "attack") {
            const off = t.starters.filter(p => p.pos !== "GK" && !["CB", "LB", "RB"].includes(p.pos));
            if (off.length > 0) ps = off;
        }
        const basePower = ps.reduce((acc, p) => acc + (sector === "midfield" ? ((p.perf?.passing || 10) + (p.perf?.vision || 10)) / 2 : (sector === "attack" ? ((p.perf?.shooting || 10) + (p.perf?.dribbling || 10)) / 2 : ((p.perf?.tackling || 10) + (p.perf?.positioning || 10)) / 2)), 0) / ps.length;
        const avgFatigue = ps.reduce((acc, p) => acc + ((p as any).fatigue || 0), 0) / ps.length;
        return basePower * this.getGeneralMultipliers(t) * (1 - (avgFatigue / 200));
    }

    private getGeneralMultipliers(team: TeamState): number {
        const cohesionBonus = 1 + (team.cohesion - 50) / 500;
        const mBonus = 1 + ((team as any).mentality - 3) * 0.05;
        return mBonus * cohesionBonus;
    }

    private decideAttackLane(t: TeamState): "LEFT" | "CENTER" | "RIGHT" {
        const r = D100(); return r < 30 ? "LEFT" : (r < 70 ? "CENTER" : "RIGHT");
    }

    private calculateFinalStats() {
        this.result.stoppageTime = Math.ceil(this.stoppageTicks / 2);
        const s = this.result.stats;
        this.log("STAT_END", `Résultat: ${this.home.name} ${this.result.homeScore}-${this.result.awayScore} ${this.away.name}`);
        this.log("STAT_END", `Passes: ${s.homePasses} - ${s.awayPasses} | Duels: ${s.homeDuelsWon}/${s.homeDuelsTotal} - ${s.awayDuelsWon}/${s.awayDuelsTotal}`);
        this.log("STAT_END", `Tirs: ${s.homeShots} - ${s.awayShots} | xG: ${s.homeXG.toFixed(2)} - ${s.awayXG.toFixed(2)}`);
        this.log("STAT_END", `Arrêts de jeu : ${this.result.stoppageTime} min`);
    }

    private updateRatings() {
        const stats = this.result.playerStats || {};
        Object.keys(stats).forEach(pidStr => {
            const pid = parseInt(pidStr); const s = stats[pidStr];
            const isPlaying = this.home.starters.some(p => p.id === pid) || this.away.starters.some(p => p.id === pid);
            if (isPlaying) {
                let r = 6.0; r += (s.goals || 0) * 1.5; r += (s.assists || 0) * 1.0; r += (s.shotsOnTarget || 0) * 0.3; r += (s.duelsWon || 0) * 0.1; r -= (s.ballsLost || 0) * 0.3; r -= (s.fatigue || 0) / 50; 
                s.rating = clamp(r, 3.0, 10.0);
            }
            s.ratingHistory?.push(s.rating);
        });
    }

    private initTeam(id: number, name: string, ps: Player[], staff: StaffImpact, intensity: number, tactic: TacticType, cohesion: number, mentality: number): TeamState {
        return {
            id, name, intensity, cohesion, tactic, staff: staff || { tactical: 10, conditioning: 10, recovery: 10, coaching: 10, reading: 10 },
            starters: ps.filter(p => p.isStarter).slice(0, 11).map(p => ({ id: p.id!, lastName: p.lastName, pos: p.position, side: p.side || "C", traits: p.traits || [], stats: p.stats, perf: this.applyForm(p.stats), fatigue: 0, confidence: 50 })),
            subs: ps.filter(p => !p.isStarter).map(p => ({ id: p.id!, lastName: p.lastName, pos: p.position, side: p.side || "C", traits: p.traits || [], stats: p.stats, perf: this.applyForm(p.stats), fatigue: 0, confidence: 50 })),
            formation: (ps[0] as any)?.teamFormation || "4-4-2", mentality: mentality || 3, subsUsed: 0, subsSlots: 0
        } as any;
    }

    private applyForm(stats: any) {
        const f = 0.95 + (Math.random() * 0.1);
        const p = { ...stats };
        Object.keys(p).forEach(k => p[k] = Math.round(p[k] * f));
        return p;
    }

    private initResult(): MatchResult {
        return { homeScore: 0, awayScore: 0, homePossession: 50, events: [], ballHistory: [], possessionHistory: [], stats: { homeChances: 0, awayChances: 0, homeShots: 0, awayShots: 0, homeShotsOnTarget: 0, awayShotsOnTarget: 0, homeXG: 0, awayXG: 0, homeXA: 0, awayXA: 0, homePPDA: 0, awayPPDA: 0, homePasses: 0, awayPasses: 0, homeDefensiveActions: 0, awayDefensiveActions: 0, homeDuelsWon: 0, awayDuelsWon: 0, homeDuelsTotal: 0, awayDuelsTotal: 0, homeDistance: 0, awayDistance: 0 }, playerStats: {}, stoppageTime: 0 };
    }
}
