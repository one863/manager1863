import { MatchStats, Token, TokenExecutionResult, TokenType, GridPosition } from "./types";
import { TOKEN_RATING_IMPACT, RATING_MODIFIERS } from "./config/rating-config";

export interface PlayerPerformance {
    playerId: number;
    playerName: string;
    teamId: string;
    role: string;
    actions: number;
    rawScore: number;      // Somme brute des impacts
    goals: number;
    assists: number;
    shots: number;
    shotsOnTarget: number;
    passes: number;
    passesCompleted: number;
    tackles: number;
    interceptions: number;
    saves: number;         // Pour les gardiens
    errors: number;
    fouls: number;
    cards: number;
}

export class StatTracker {
    private stats: MatchStats;
    private playerPerformances: Map<number, PlayerPerformance> = new Map();
    private homeTeamId: number;
    private awayTeamId: number;
    private lastPasser: number | null = null; // Pour tracker les assists

    constructor(homeTeamId: number, awayTeamId: number) {
        this.homeTeamId = homeTeamId;
        this.awayTeamId = awayTeamId;
        this.stats = {
            possession: { [homeTeamId]: 0, [awayTeamId]: 0 },
            xg: { [homeTeamId]: 0, [awayTeamId]: 0 },
            passes: {
                [homeTeamId]: { total: 0, successful: 0 },
                [awayTeamId]: { total: 0, successful: 0 }
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
            corners: { [homeTeamId]: 0, [awayTeamId]: 0 },
            cards: { [homeTeamId]: 0, [awayTeamId]: 0 },
            woodwork: { [homeTeamId]: 0, [awayTeamId]: 0 }
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

            if (s.isDuel && this.stats.duels) {
                (this.stats.duels as any)[teamId].total++;
                if (s.isSuccess) (this.stats.duels as any)[teamId].won++;
            }

            if (s.isInterception && this.stats.interceptions) (this.stats.interceptions as any)[teamId]++;
        }

        if (result.isGoal) {
            this.stats.shots[teamId].total++;
            this.stats.shots[teamId].onTarget++;
            this.stats.shots[teamId].goals++;
        } else if (result.eventSubtype === 'SHOT' || result.eventSubtype === 'SAVE' || result.eventSubtype === 'WOODWORK') {
            this.stats.shots[teamId].total++;
            if (result.eventSubtype !== 'SHOT' && result.eventSubtype !== 'WOODWORK') {
                this.stats.shots[teamId].onTarget++;
            }
            if (result.eventSubtype === 'WOODWORK') {
                if (this.stats.woodwork) (this.stats.woodwork as any)[teamId]++;
            }
        }

        if (result.eventSubtype === 'FOUL') this.stats.fouls[teamId]++;
        if (result.eventSubtype === 'CORNER') this.stats.corners[teamId]++;
    }

    /**
     * Track une action individuelle pour le calcul du rating
     */
    public trackPlayerAction(
        playerId: number, 
        playerName: string, 
        teamId: number, 
        role: string,
        tokenType: TokenType, 
        result: TokenExecutionResult,
        ballPos: GridPosition
    ) {
        if (playerId === 0) return;

        // Initialiser le joueur s'il n'existe pas
        if (!this.playerPerformances.has(playerId)) {
            this.playerPerformances.set(playerId, {
                playerId,
                playerName,
                teamId: String(teamId),
                role,
                actions: 0,
                rawScore: 0,
                goals: 0,
                assists: 0,
                shots: 0,
                shotsOnTarget: 0,
                passes: 0,
                passesCompleted: 0,
                tackles: 0,
                interceptions: 0,
                saves: 0,
                errors: 0,
                fouls: 0,
                cards: 0
            });
        }

        const perf = this.playerPerformances.get(playerId)!;
        perf.actions++;

        // Calculer l'impact du jeton sur le rating
        let ratingImpact = TOKEN_RATING_IMPACT[tokenType] || 0;

        // Modificateur contextuel : zone dangereuse (surface)
        const isInDangerZone = this.isInDangerZone(ballPos, teamId);
        const isInOwnZone = this.isInOwnDangerZone(ballPos, teamId);
        
        if (isInDangerZone && ratingImpact > 0) {
            ratingImpact *= RATING_MODIFIERS.DANGER_ZONE_MULTIPLIER;
        }
        if (isInOwnZone && ratingImpact < 0) {
            ratingImpact *= RATING_MODIFIERS.OWN_ZONE_ERROR_MULTIPLIER;
        }

        perf.rawScore += ratingImpact;

        // Tracker les stats spécifiques
        if (result.isGoal) {
            perf.goals++;
            // Bonus d'assist au dernier passeur
            if (this.lastPasser && this.lastPasser !== playerId) {
                const assistPlayer = this.playerPerformances.get(this.lastPasser);
                if (assistPlayer && String(assistPlayer.teamId) === String(teamId)) {
                    assistPlayer.assists++;
                    assistPlayer.rawScore += RATING_MODIFIERS.ASSIST_BONUS;
                }
            }
            this.lastPasser = null;
        }

        // Tracker passe réussie pour potential assist
        const isPassAction = tokenType.startsWith('PASS') || 
            ['THROUGH_BALL', 'CROSS', 'CUT_BACK', 'COMBO_PASS', 'HEAD_PASS'].includes(tokenType);
        if (isPassAction) {
            perf.passes++;
            if (result.stats?.isSuccess !== false) {
                perf.passesCompleted++;
                this.lastPasser = playerId;
            }
        } else if (tokenType.startsWith('SHOOT') || tokenType === 'HEAD_SHOT' || tokenType === 'PENALTY_GOAL' || tokenType === 'PENALTY_MISS') {
            perf.shots++;
            if (result.isGoal || result.eventSubtype === 'SAVE') {
                perf.shotsOnTarget++;
            }
            // Reset lastPasser après un tir (pas d'assist si le tir rate)
            if (!result.isGoal) {
                this.lastPasser = null;
            }
        } else if (tokenType === 'TACKLE' || tokenType === 'DUEL_WON') {
            perf.tackles++;
        } else if (tokenType === 'INTERCEPT' || tokenType === 'BALL_RECOVERY') {
            perf.interceptions++;
        } else if (tokenType === 'SAVE' || tokenType === 'CLAIM' || tokenType === 'PUNCH' || tokenType === 'PENALTY_SAVED') {
            perf.saves++;
        } else if (tokenType === 'ERROR' || tokenType === 'GK_BOULETTE' || tokenType === 'OWN_GOAL') {
            perf.errors++;
        } else if (tokenType === 'FOUL') {
            perf.fouls++;
        } else if (tokenType === 'CARD' || tokenType === 'YELLOW_CARD' || tokenType === 'RED_CARD') {
            perf.cards++;
        }
    }

    /**
     * Applique les bonus/malus de fin de match (clean sheet, buts encaissés)
     */
    public applyEndOfMatchModifiers(homeGoals: number, awayGoals: number) {
        const defensiveRoles = ['GK', 'DC', 'DL', 'DR'];
        
        this.playerPerformances.forEach((perf) => {
            const isDefender = defensiveRoles.includes(perf.role);
            const isHomeTeam = String(perf.teamId) === String(this.homeTeamId);
            const goalsConceived = isHomeTeam ? awayGoals : homeGoals;
            const hasCleanSheet = goalsConceived === 0;

            if (isDefender) {
                if (hasCleanSheet) {
                    perf.rawScore += RATING_MODIFIERS.CLEAN_SHEET_BONUS;
                } else {
                    // Malus par but encaissé (atténué)
                    perf.rawScore += RATING_MODIFIERS.GOAL_CONCEDED_PENALTY * goalsConceived;
                }
            }
        });
    }

    /**
     * Calcule les ratings finaux de tous les joueurs
     */
    public getPlayerRatings(): Array<{
        id: number;
        name: string;
        teamId: string;
        role: string;
        rating: number;
        goals: number;
        assists: number;
        actions: number;
        stats: PlayerPerformance;
    }> {
        const ratings: Array<{
            id: number;
            name: string;
            teamId: string;
            role: string;
            rating: number;
            goals: number;
            assists: number;
            actions: number;
            stats: PlayerPerformance;
        }> = [];

        this.playerPerformances.forEach((perf) => {
            // Le rating est basé sur BASE_RATING + rawScore
            // Plus le joueur a d'actions, plus son score peut s'écarter de la moyenne
            let rating = RATING_MODIFIERS.BASE_RATING + perf.rawScore;

            // Clamp entre MIN et MAX
            rating = Math.max(RATING_MODIFIERS.MIN_RATING, Math.min(RATING_MODIFIERS.MAX_RATING, rating));

            // Arrondir à 1 décimale
            rating = Math.round(rating * 10) / 10;

            ratings.push({
                id: perf.playerId,
                name: perf.playerName,
                teamId: perf.teamId,
                role: perf.role,
                rating,
                goals: perf.goals,
                assists: perf.assists,
                actions: perf.actions,
                stats: perf
            });
        });

        // Trier par rating décroissant
        return ratings.sort((a, b) => b.rating - a.rating);
    }

    private isInDangerZone(pos: GridPosition, teamId: number): boolean {
        // Surface adverse (zones de tir)
        const isHomeTeam = teamId === this.homeTeamId;
        if (isHomeTeam) {
            return pos.x >= 4 && pos.y >= 1 && pos.y <= 3;
        } else {
            return pos.x <= 1 && pos.y >= 1 && pos.y <= 3;
        }
    }

    private isInOwnDangerZone(pos: GridPosition, teamId: number): boolean {
        // Notre propre surface
        const isHomeTeam = teamId === this.homeTeamId;
        if (isHomeTeam) {
            return pos.x <= 1 && pos.y >= 1 && pos.y <= 3;
        } else {
            return pos.x >= 4 && pos.y >= 1 && pos.y <= 3;
        }
    }

    public getFinalStats(): MatchStats {
        const totalTime = Object.values(this.stats.possession).reduce((a, b) => a + b, 0) || 1;
        const possessionPercent: { [teamId: string]: number } = {};
        for (const teamId in this.stats.possession) {
            const teamIdStr = String(teamId);
            possessionPercent[teamIdStr] = Math.round(((this.stats.possession as any)[teamId] / totalTime) * 100);
        }

        return {
            ...this.stats,
            possessionPercent,
            xg: Object.fromEntries(Object.entries(this.stats.xg).map(([id, val]) => [id, Math.round(val * 100) / 100])) as any
        };
    }
}
