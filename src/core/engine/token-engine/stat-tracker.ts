import { MatchStats, Token, TokenExecutionResult } from "./types";

export class StatTracker {
    private stats: MatchStats;

    constructor(homeTeamId: number, awayTeamId: number) {
        this.stats = {
            possession: { [homeTeamId]: 0, [awayTeamId]: 0 },
            xg: { [homeTeamId]: 0, [awayTeamId]: 0 },
            passes: {
                [homeTeamId]: { attempted: 0, successful: 0 },
                [awayTeamId]: { attempted: 0, successful: 0 }
            },
            shots: {
                [homeTeamId]: { total: 0, onTarget: 0, goals: 0 },
                [awayTeamId]: { total: 0, onTarget: 0, goals: 0 }
            },
            duels: {
                [homeTeamId]: { total: 0, won: 0 },
                [awayTeamId]: { total: 0, won: 0 }
            },
            interceptions: { [homeTeamId]: 0, [awayTeamId]: 0 },
            fouls: { [homeTeamId]: 0, [awayTeamId]: 0 },
            corners: { [homeTeamId]: 0, [awayTeamId]: 0 }
        };
    }

    public trackAction(teamId: number, result: TokenExecutionResult, duration: number) {
        if (teamId === 0) return;

        this.stats.possession[teamId] += duration;

        if (result.stats) {
            const s = result.stats;
            if (s.xg) this.stats.xg[teamId] += s.xg;
            
            if (s.isPass) {
                this.stats.passes[teamId].attempted++;
                if (s.isSuccess) this.stats.passes[teamId].successful++;
            }

            if (s.isDuel) {
                this.stats.duels[teamId].total++;
                if (s.isSuccess) this.stats.duels[teamId].won++;
            }

            if (s.isInterception) this.stats.interceptions[teamId]++;
        }

        if (result.eventSubtype === 'SHOT' || result.eventSubtype === 'GOAL' || result.eventSubtype === 'SAVE') {
            this.stats.shots[teamId].total++;
            if (result.eventSubtype !== 'SHOT') this.stats.shots[teamId].onTarget++;
        }

        if (result.eventSubtype === 'FOUL') this.stats.fouls[teamId]++;
        if (result.eventSubtype === 'CORNER') this.stats.corners[teamId]++;
    }

    public registerGoal(teamId: number) {
        this.stats.shots[teamId].goals++;
    }

    public getFinalStats(): MatchStats {
        const totalTime = Object.values(this.stats.possession).reduce((a, b) => a + b, 0) || 1;
        const possessionPercent: { [teamId: number]: number } = {};
        for (const teamId in this.stats.possession) {
            possessionPercent[teamId] = Math.round((this.stats.possession[teamId] / totalTime) * 100);
        }

        return {
            ...this.stats,
            possessionPercent,
            // Arrondir les xG
            xg: Object.fromEntries(Object.entries(this.stats.xg).map(([id, val]) => [id, Math.round(val * 100) / 100])) as any
        };
    }
}
