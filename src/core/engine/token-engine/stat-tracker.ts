import { MatchStats, Token, TokenType } from "./types";

export class StatTracker {
    private stats: MatchStats;

    constructor(homeTeamId: number, awayTeamId: number) {
        this.stats = {
            possession: { [homeTeamId]: 0, [awayTeamId]: 0 },
            passes: {
                [homeTeamId]: { attempted: 0, successful: 0 },
                [awayTeamId]: { attempted: 0, successful: 0 }
            },
            shots: {
                [homeTeamId]: { total: 0, onTarget: 0, goals: 0 },
                [awayTeamId]: { total: 0, onTarget: 0, goals: 0 }
            },
            fouls: { [homeTeamId]: 0, [awayTeamId]: 0 },
            corners: { [homeTeamId]: 0, [awayTeamId]: 0 }
        };
    }

    public trackAction(token: Token, success: boolean, duration: number) {
        const teamId = token.teamId;
        if (teamId === 0) return; // Action système sans équipe

        this.stats.possession[teamId] += duration;

        switch (token.type) {
            case 'PASS':
                this.stats.passes[teamId].attempted++;
                if (success) this.stats.passes[teamId].successful++;
                break;
            case 'COMBO_PASS':
                const count = token.metadata?.passCount || 3;
                this.stats.passes[teamId].attempted += count;
                this.stats.passes[teamId].successful += count;
                break;
            case 'SHOOT':
                this.stats.shots[teamId].total++;
                if (success) this.stats.shots[teamId].onTarget++;
                break;
            case 'FOUL':
                this.stats.fouls[teamId]++;
                break;
            case 'CORNER':
                this.stats.corners[teamId]++;
                break;
        }
    }

    public registerGoal(teamId: number) {
        this.stats.shots[teamId].goals++;
    }

    public getFinalStats() {
        // Calcul des pourcentages de possession
        const totalTime = Object.values(this.stats.possession).reduce((a, b) => a + b, 0);
        const possessionPercent: { [teamId: number]: number } = {};
        for (const teamId in this.stats.possession) {
            possessionPercent[teamId] = Math.round((this.stats.possession[teamId] / totalTime) * 100);
        }

        return {
            ...this.stats,
            possessionPercent
        };
    }
}
