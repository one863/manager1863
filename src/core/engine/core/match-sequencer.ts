import { clamp, randomInt } from "@/core/utils/math";
import { CoachAI } from "./coach-ai";
import { D20, D100, calculateVolumeLoss } from "./probabilities";
import { handleResolution, handleSetPiece, type TeamState, type PlayerState } from "./match-actions";
import { TACTIC_DEFINITIONS } from "./tactics";
import type { Player } from "@/core/db/db";
import type { MatchResult, PlayerMatchStats, TacticType, PlayerUpdate } from "./types";
import { ENGINE_TUNING } from "./config";

export interface StaffImpact {
    coaching: number; tactical: number; reading: number; recovery: number; conditioning: number;
    psychology?: number; 
    medicine?: number;
    discipline?: number;
}

export class MatchSequencer {
    private home: TeamState;
    private away: TeamState;
    private result: MatchResult;
    private unavailable = new Set<number>();
    private sentOff = new Set<number>();

    constructor(
        homePlayers: Player[], awayPlayers: Player[], 
        homeName: string, awayName: string,
        homeId: number, awayId: number,
        hStaff: StaffImpact, aStaff: StaffImpact,
        hInt = 3, aInt = 3,
        hTactic: TacticType = "NORMAL", aTactic: TacticType = "NORMAL",
        hCohesion = 50, aCohesion = 50 
    ) {
        this.result = this.initResult();
        this.home = this.initTeam(homeId, homeName, homePlayers, hStaff, hInt, hTactic, hCohesion);
        this.away = this.initTeam(awayId, awayName, awayPlayers, aStaff, aInt, aTactic, aCohesion);
        
        [...homePlayers, ...awayPlayers].forEach(p => { 
            if (p.id) this.result.playerStats![p.id.toString()] = this.initPlayerStats(); 
        });
    }

    private smooth(val: number): number {
        if (val <= 0) return 0;
        return Math.sqrt(val * ENGINE_TUNING.INITIATIVE_LOG_FACTOR);
    }

    public async run(): Promise<MatchResult> {
        const totalMinutes = 90 + randomInt(2, 5);
        let hControl = 0, aControl = 0;

        for (let min = 1; min <= totalMinutes; min++) {
            const scoreDiff = this.result.homeScore - this.result.awayScore;
            
            const hEffInt = scoreDiff >= 3 ? Math.max(1, this.home.intensity - 2) : this.home.intensity;
            const aEffInt = scoreDiff <= -3 ? Math.max(1, this.away.intensity - 2) : this.away.intensity;

            this.handleCoachDecisions(min, this.home);
            this.handleCoachDecisions(min, this.away);

            this.updateVQN(hEffInt, aEffInt, scoreDiff);
            this.updateSectorStats(this.home);
            this.updateSectorStats(this.away);

            if (min >= 80) {
                 this.applyMoneyTimeEffects(this.home, scoreDiff <= -1);
                 this.applyMoneyTimeEffects(this.away, scoreDiff >= 1);
            }
            
            const scoreH = this.calcInitiative(this.home, hEffInt);
            const scoreA = this.calcInitiative(this.away, aEffInt);
            const diff = scoreH - scoreA;

            let active: TeamState | null = null;
            
            const noise = (Math.random() - 0.5) * 4; 
            const threshold = ENGINE_TUNING.NEUTRAL_ZONE_THRESHOLD + noise;

            if (diff > threshold) { 
                active = this.home; 
                hControl++; 
            } else if (diff < -threshold) { 
                active = this.away; 
                aControl++; 
            } else {
                if (Math.random() < 0.1) hControl++;
                else if (Math.random() < 0.1) aControl++;
            }

            if (active) {
                const opp = active === this.home ? this.away : this.home;
                const curInt = active === this.home ? hEffInt : aEffInt;
                
                // --- V4.5.7 : Suppression du Cap Tactique pour libérer le volume de jeu ---
                const tacticSkillBonus = active.staff.tactical / 2; 
                const threshold = ENGINE_TUNING.BASE_TRANSITION_CHANCE + tacticSkillBonus + (curInt * 2) + (active.cohesion * ENGINE_TUNING.COHESION_WEIGHT); 

                const roll = D100();

                if (roll < threshold) {
                    handleResolution(min, active, opp, this.result, false, this.home.id);
                } else if (roll < threshold + 5) {
                    handleSetPiece(min, active, opp, this.result, this.home.id);
                } else {
                    const attackers = active.starters.filter(p => p.pos === "FWD" || p.side !== "C");
                    const avgAggression = attackers.reduce((sum, p) => sum + (p.stats.aggression || 10), 0) / (attackers.length || 1);
                    
                    const attPressing = (active.sectorStats.attackCenter + active.sectorStats.attackLeft + active.sectorStats.attackRight) / 3;
                    const defResistance = opp.sectorStats.defense; 

                    const tacticBonus = active.tactic === "PRESSING" ? 1.2 : 1.0;
                    
                    if (D100() < 10 && (this.smooth(attPressing) * tacticBonus + (avgAggression / 2) + D20()) > (this.smooth(defResistance) + D20())) {
                        this.result.events.push({ 
                            minute: min, 
                            type: "COUNTER_PRESS", 
                            teamId: active.id, 
                            description: `Gros pressing de ${active.name} qui étouffe la relance !` 
                        });
                        handleResolution(min, active, opp, this.result, false, this.home.id, 0.10); 
                    } else {
                        const defAnticipation = opp.starters
                            .filter(p => p.pos === "DEF" || p.pos === "MID")
                            .reduce((sum, p) => sum + (p.stats.anticipation || 10), 0) / 5;

                        const fastPlayer = opp.starters.reduce((a, b) => a.perf.v_spd > b.perf.v_spd ? a : b);
                        
                        if (D100() < (fastPlayer.perf.v_spd * 3) - (defAnticipation * 2)) {
                            handleResolution(min, opp, active, this.result, true, this.home.id);
                        }
                    }
                }
            }

            this.applyFatigue(this.home, hEffInt);
            this.applyFatigue(this.away, aEffInt);
        }

        const tot = hControl + aControl;
        if (tot > 0) {
            let hPoss = Math.round((hControl / tot) * 100);
            hPoss = clamp(hPoss, 15, 85);
            this.result.homePossession = hPoss;
        } else {
            this.result.homePossession = 50;
        }
        
        this.calculateRatings();
        this.finalizePlayerUpdates();

        return this.result;
    }

    private calculateRatings() {
        Object.keys(this.result.playerStats!).forEach(playerId => {
            const stats = this.result.playerStats![playerId];
            let rating = 6.0; 

            rating += (stats.goals * 1.0);
            rating += (stats.assists * 0.5);
            rating += (stats.shotsOnTarget * 0.2);
            rating += (stats.saves * 0.4); 
            rating += (stats.interventions * 0.1); 
            rating -= (stats.ballsLost * 0.05);

            stats.rating = Math.min(10, Math.round(rating * 10) / 10);
        });
    }

    private finalizePlayerUpdates() {
        this.result.playerUpdates = {};
        
        const processTeam = (t: TeamState) => {
            t.starters.forEach(p => {
                const finalConfidence = clamp(50 + (p.confidence * 5), 0, 100);
                this.result.playerUpdates![p.id.toString()] = {
                    energy: Math.round(p.v_dyn), 
                    confidence: Math.round(finalConfidence)
                };
            });
        };

        processTeam(this.home);
        processTeam(this.away);
    }

    private handleCoachDecisions(min: number, t: TeamState) {
        const decision = CoachAI.decideSubstitutions(
            min, t.starters as any, t.subs, 
            { tactical: t.staff.tactical, management: t.staff.coaching, preferredStrategy: "BALANCED" },
            t.subsUsed, t.subsSlots, t.id, this.result.homeScore, this.result.awayScore, this.unavailable, this.sentOff
        );
        if (decision.events.length > 0) {
            this.result.events.push(...decision.events);
            t.subsUsed = decision.used;
            t.subsSlots = decision.slots;
        }
    }

    private updateVQN(hInt: number, aInt: number, scoreDiff: number) {
        const update = (team: TeamState, curInt: number, isDominating: boolean) => {
            team.starters.forEach(p => {
                const malus = p.v_dyn < 50 ? (p.v_dyn / 50) : 1.0;
                const iBonus = 0.85 + (curInt * 0.05);
                
                const agilityFactor = (p.stats.agility || 10) / 10;
                const controlFactor = (p.stats.ballControl || 10) / 10;

                p.perf = {
                    q_pass: p.stats.passing * malus * iBonus * controlFactor,
                    q_shoot: p.stats.shooting * malus * iBonus * controlFactor,
                    q_tackle: p.stats.tackling * malus * iBonus * agilityFactor,
                    n_vis: p.stats.vision * malus,
                    n_pla: p.stats.positioning * malus * (isDominating ? 0.7 : 1.0),
                    n_com: p.stats.composure * malus,
                    v_spd: p.stats.speed * (p.v_dyn / 100) * iBonus * agilityFactor,
                    
                    n_agg: (p.stats.aggression || 10) * malus,
                    n_lea: (p.stats.leadership || 10) * malus,
                    v_jmp: (p.stats.jumping || 10) * malus,
                    q_cro: (p.stats.crossing || 10) * malus,
                    n_ant: (p.stats.anticipation || 10) * malus,
                };
            });
        };
        update(this.home, hInt, scoreDiff >= 3);
        update(this.away, aInt, scoreDiff <= -3);
    }
    
    private updateSectorStats(t: TeamState) {
        const mod = TACTIC_DEFINITIONS[t.tactic];
        
        const sumStats = (players: PlayerState[], attrs: string[]) => {
            if (players.length === 0) return 0;
            let sum = 0;
            players.forEach(p => {
                attrs.forEach(a => sum += (p.perf[a] || 0));
            });
            return sum / players.length; 
        };

        const defs = t.starters.filter(p => p.pos === "DEF" || p.pos === "GK");
        const mids = t.starters.filter(p => p.side === "C" && p.pos === "MID"); 
        
        let midPower = sumStats(mids, ["q_pass", "n_vis", "n_pla"]);
        if (mod.midfield) midPower *= mod.midfield;
        
        let defPower = sumStats(defs, ["q_tackle", "n_pla", "v_spd"]);
        const avgAnticipation = sumStats(defs, ["n_ant"]);
        defPower += (avgAnticipation * 0.5);
        if (mod.defenseCenter) defPower *= mod.defenseCenter;

        const lefts = t.starters.filter(p => p.side === "L" && p.pos !== "GK");
        const rights = t.starters.filter(p => p.side === "R" && p.pos !== "GK");
        const centers = t.starters.filter(p => p.side === "C" && p.pos !== "GK");

        let attL = sumStats(lefts, ["q_shoot", "v_spd", "q_cro"]);
        if (mod.attackLeft) attL *= mod.attackLeft;

        let attR = sumStats(rights, ["q_shoot", "v_spd", "q_cro"]);
        if (mod.attackRight) attR *= mod.attackRight;

        let attC = sumStats(centers, ["q_shoot", "n_vis", "n_com"]);
        const avgJump = sumStats(centers, ["v_jmp"]);
        attC += (avgJump * 0.3);
        if (mod.attackCenter) attC *= mod.attackCenter;

        t.sectorStats = {
            midfield: midPower,
            defense: defPower,
            attackLeft: attL,
            attackRight: attR,
            attackCenter: attC
        };
    }

    private applyMoneyTimeEffects(t: TeamState, isLosing: boolean) {
        const leader = t.starters.reduce((prev, current) => (prev.perf.n_lea || 0) > (current.perf.n_lea || 0) ? prev : current);
        
        if (leader && (leader.perf.n_lea || 0) > 14) {
             t.starters.forEach(p => {
                if (p.id !== leader.id) {
                    const boost = isLosing ? 0.5 : 1; 
                    p.confidence = clamp(p.confidence + boost, -10, 10);
                }
            });
        }

        if (t.cohesion < 40) {
             t.starters.filter(p => p.pos === "DEF" || p.pos === "GK").forEach(p => {
                p.perf.n_pla *= 0.9; 
                p.perf.n_com *= 0.9; 
            });
        }
    }

    private calcInitiative(t: TeamState, curInt: number): number {
        const smoothedMidfield = this.smooth(t.sectorStats.midfield);
        const smoothedCohesion = this.smooth(t.cohesion);
        
        return smoothedMidfield + D20() + t.staff.reading + (curInt * 1.5) + (smoothedCohesion / 4);
    }

    private applyFatigue(t: TeamState, curInt: number) {
        const medicineFactor = (t.staff.medicine || 5) / 20;

        t.starters.forEach(p => {
            let loss = calculateVolumeLoss(p.stats.stamina as number, curInt, t.staff.recovery / 100);
            loss *= (1.2 - (medicineFactor * 0.4)); 
            p.v_dyn = Math.max(0, p.v_dyn - loss);
        });
    }

    private initTeam(id: number, name: string, ps: Player[], staff: StaffImpact, intensity: number, tactic: TacticType, cohesion: number): TeamState {
        return {
            id, name, intensity, controlMins: 0,
            starters: ps.filter(p => p.isStarter).map(p => ({
                id: p.id!, lastName: p.lastName, pos: p.position,
                side: (p.side as "L"|"C"|"R") || "C",
                traits: p.traits, 
                v_dyn: clamp(p.energy + (staff.conditioning / 2), 0, 100),
                confidence: clamp((p.confidence - 50) / 5, -10, 10),
                stats: { ...p.stats, goalkeeping: p.stats.goalkeeping || 10 }, 
                perf: {} 
            })),
            subs: ps.filter(p => !p.isStarter),
            staff, 
            cohesion: cohesion, 
            subsUsed: 0, subsSlots: 0,
            tactic,
            sectorStats: { midfield: 0, defense: 0, attackLeft: 0, attackRight: 0, attackCenter: 0 } 
        };
    }

    private initResult(): MatchResult {
        return { homeScore: 0, awayScore: 0, homePossession: 50, events: [], stats: { homeChances: 0, awayChances: 0, homeShots: 0, awayShots: 0, homeShotsOnTarget: 0, awayShotsOnTarget: 0, homeXG: 0, awayXG: 0, homeXA: 0, awayXA: 0, homePPDA: 0, awayPPDA: 0, homePasses: 0, awayPasses: 0, homeDefensiveActions: 0, awayDefensiveActions: 0, homeDuelsWon: 0, awayDuelsWon: 0, homeDuelsTotal: 0, awayDuelsTotal: 0, homeDistance: 0, awayDistance: 0 }, playerPerformances: {}, playerStats: {}, playerUpdates: {} };
    }

    private initPlayerStats(): PlayerMatchStats {
        return { rating: 0, goals: 0, assists: 0, shots: 0, shotsOnTarget: 0, xg: 0, xa: 0, passes: 0, passesSuccess: 0, duels: 0, duelsWon: 0, distance: 0, sprints: 0, interventions: 0, saves: 0, ballsLost: 0 };
    }
}
