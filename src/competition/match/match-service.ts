import { generateSeasonFixtures } from "@/core/generators/league-templates";
import { type Match, type Player, type Team, db } from "@/core/db/db";
import { type MatchResult } from "@/core/types";
import { ClubService } from "@/club/club-service";
import { NewsService } from "@/news/service/news-service";
import i18next from "i18next";
import { UpdateTeamSchema } from "@/core/domain";
import { validateOrThrow } from "@/core/validation/zod-utils";

/**
 * Worker dédié à la simulation.
 */
const simulationWorker = new Worker(
    new URL("../../core/engine/simulation.worker.ts", import.meta.url),
    { type: "module" },
);

/**
 * Exécute une simulation unique.
 */
const runMatchInWorker = (matchData: any, language: string): Promise<MatchResult> => {
    return new Promise((resolve, reject) => {
        const requestId = Math.random().toString(36).substring(7);
        const timeout = setTimeout(() => reject(new Error("MATCH_SIMULATION_TIMEOUT")), 15000);

        const handler = (e: MessageEvent) => {
            const { type, payload } = e.data;
            if ((type === "MATCH_COMPLETE" || type === "MATCH_ERROR") && payload.requestId === requestId) {
                clearTimeout(timeout);
                simulationWorker.removeEventListener("message", handler);
                if (type === "MATCH_ERROR") reject(new Error(payload.error));
                else resolve(payload.result);
            }
        };
        simulationWorker.addEventListener("message", handler);
        simulationWorker.postMessage({ type: "SIMULATE_MATCH", payload: { ...matchData, requestId, language } });
    });
};

export const MatchService = {
    async hasUserMatchToday(saveId: number, day: number, userTeamId: number): Promise<boolean> {
        return !!(await db.matches
            .where("[saveId+day]")
            .equals([saveId, day])
            .and((m) => (m.homeTeamId === userTeamId || m.awayTeamId === userTeamId) && !m.played)
            .first());
    },

    async simulateDayByDay(saveId: number, day: number, userTeamId: number, date: Date): Promise<any> {
        const todaysMatches = await db.matches.where("[saveId+day]").equals([saveId, day]).toArray();
        const userMatch = todaysMatches.find((m) => (m.homeTeamId === userTeamId || m.awayTeamId === userTeamId) && !m.played);
        const otherMatches = todaysMatches.filter((m) => !m.played && m.homeTeamId !== userTeamId && m.awayTeamId !== userTeamId);
        
        const allPlayers = await db.players.where("saveId").equals(saveId).toArray();
        const playersByTeam = allPlayers.reduce((acc, player) => {
            if (!acc[player.teamId]) acc[player.teamId] = [];
            acc[player.teamId].push(player); 
            return acc;
        }, {} as Record<number, Player[]>);

        // 1. Lancement des matchs IA (Batch)
        if (otherMatches.length > 0) {
            const batchPayload = await Promise.all(otherMatches.map(async (m) => {
                const [hT, aT] = await Promise.all([db.teams.get(m.homeTeamId), db.teams.get(m.awayTeamId)]);
                return {
                    matchId: m.id,
                    homeTeamId: m.homeTeamId, awayTeamId: m.awayTeamId,
                    homePlayers: playersByTeam[m.homeTeamId] || [],
                    awayPlayers: playersByTeam[m.awayTeamId] || [],
                    homeName: hT?.name, awayName: aT?.name,
                    hTactic: hT?.tacticType, aTactic: aT?.tacticType
                };
            }));
            this.runBatchSimulation(batchPayload, saveId, date);
        }

        // 2. Traitement du match utilisateur
        if (userMatch) {
            const [homeT, awayT] = await Promise.all([db.teams.get(userMatch.homeTeamId), db.teams.get(userMatch.awayTeamId)]);
            const result = await runMatchInWorker({
                matchId: userMatch.id,
                homeTeamId: userMatch.homeTeamId, awayTeamId: userMatch.awayTeamId,
                homePlayers: playersByTeam[userMatch.homeTeamId] || [],
                awayPlayers: playersByTeam[userMatch.awayTeamId] || [],
                homeName: homeT?.name, awayName: awayT?.name
            }, i18next.language);

            // --- NOUVEAU : Stockage temporaire des logs pour le Live ---
            await db.matchLogs.put({
                saveId: saveId,
                matchId: userMatch.id!,
                debugLogs: result.debugLogs,
                events: result.events || [],
                ballHistory: result.ballHistory || []
            });

            return { matchId: userMatch.id!, homeTeam: homeT, awayTeam: awayT, result };
        }
        return null;
    },

    runBatchSimulation(matches: any[], saveId: number, date: Date) {
        simulationWorker.postMessage({ 
            type: "SIMULATE_BATCH", 
            payload: { matches, saveId, language: i18next.language } 
        });

        const handler = async (e: MessageEvent) => {
            const { type, payload } = e.data;
            if (type === "BATCH_COMPLETE" && payload.saveId === saveId) {
                simulationWorker.removeEventListener("message", handler);
                await db.transaction('rw', [db.matches, db.teams, db.news], async () => {
                    for (const res of payload.results) {
                        const m = await db.matches.get(res.matchId);
                        if (m && !m.played) await this.saveMatchResult(m, res.result, saveId, date, false);
                    }
                });
            }
        };
        simulationWorker.addEventListener("message", handler);
    },

    /**
     * Persistance finale (Version allégée pour DB permanente)
     */
    async saveMatchResult(match: Match, result: MatchResult, saveId: number, date: Date, generateNews = true) {
        // Selon ta doc : On ne garde QUE les stats/butteurs/notes dans la table matches
        const lightDetails = {
            stats: result.stats,
            scorers: [
                ...(Array.isArray(result.homeScorers) ? result.homeScorers : []),
                ...(Array.isArray(result.awayScorers) ? result.awayScorers : [])
            ],
            ratings: result.ratings,
            stoppageTime: result.stoppageTime || 0
        };

        await db.matches.update(match.id!, { 
            homeScore: result.homeScore, 
            awayScore: result.awayScore, 
            played: true, 
            details: lightDetails // ❌ debugLogs, events, ballHistory exclus
        });

        await Promise.all([
            this.updateTeamStats(match.homeTeamId, result.homeScore, result.awayScore), 
            this.updateTeamStats(match.awayTeamId, result.awayScore, result.homeScore),
            ClubService.processSuspensions(saveId, match.homeTeamId), 
            ClubService.processSuspensions(saveId, match.awayTeamId)
        ]);

        if (generateNews) {
            await NewsService.generateMatchNews(saveId, date, match.homeTeamId, match.awayTeamId, result.homeScore, result.awayScore);
        }
    },

    async updateTeamStats(teamId: number, goalsFor: number, goalsAgainst: number) {
        const team = await db.teams.get(teamId);
        if (!team) return;

        let { points: pts = 0, wins = 0, draws = 0, losses = 0 } = team;
        if (goalsFor > goalsAgainst) { pts += 3; wins += 1; }
        else if (goalsFor < goalsAgainst) { losses += 1; }
        else { pts += 1; draws += 1; }

        const update = validateOrThrow(UpdateTeamSchema, {
            matchesPlayed: (team.matchesPlayed || 0) + 1,
            points: pts,
            wins, draws, losses,
            goalsFor: (team.goalsFor || 0) + goalsFor,
            goalsAgainst: (team.goalsAgainst || 0) + goalsAgainst,
            goalDifference: (team.goalsFor || 0) + goalsFor - ((team.goalsAgainst || 0) + goalsAgainst),
        }, "MatchService.updateTeamStats");

        await db.teams.update(teamId, update);
    },

    async checkSeasonEnd(saveId: number, userLeagueId: number, resetStats = false): Promise<boolean> {
        const totalMatches = await db.matches.where("leagueId").equals(userLeagueId).count();
        const playedMatches = await db.matches.where("leagueId").equals(userLeagueId).and((m) => m.played).count();
        
        if (totalMatches === 0 || totalMatches !== playedMatches) return false;

        const state = await db.gameState.where("saveId").equals(saveId).first();
        if (!state) return false;

        const allLeagues = await db.leagues.where("saveId").equals(saveId).toArray();
        allLeagues.sort((a, b) => a.level - b.level);

        for (const league of allLeagues) {
            const teams = await db.teams.where("leagueId").equals(league.id!).toArray();
            teams.sort((a, b) => (b.points || 0) - (a.points || 0) || (b.goalDifference || 0) - (a.goalDifference || 0));
            
            for (let i = 0; i < teams.length; i++) {
                const t = teams[i];
                await db.history.add({ 
                    saveId, teamId: t.id!, seasonYear: state.season, 
                    leagueName: league.name, position: i + 1, points: t.points || 0, 
                    goalsFor: t.goalsFor || 0, goalsAgainst: t.goalsAgainst || 0 
                });
            }
        }

        if (resetStats) {
            for (const league of allLeagues) {
                const currentTeams = await db.teams.where("leagueId").equals(league.id!).toArray();
                const teamIds = currentTeams.map((t) => t.id!);
                for (const t of currentTeams) {
                    await db.teams.update(t.id!, { 
                        points: 0, matchesPlayed: 0, goalsFor: 0, goalsAgainst: 0, 
                        goalDifference: 0, wins: 0, draws: 0, losses: 0 
                    });
                }
                await generateSeasonFixtures(saveId, league.id!, teamIds);
            }
        }
        return true;
    },

    /**
     * Purge de la table temporaire (Appelé à la fin du live)
     */
    async clearLiveMatchLogs(saveId: number, matchId: number) {
        await db.matchLogs.where({ saveId, matchId }).delete();
        console.log(`[Nettoyage] matchLogs supprimés pour le match ${matchId}`);
    },

    /**
     * Nettoyage périodique (News + Anciens logs si nécessaire)
     */
    async cleanupOldUserMatchLogs(saveId: number, userTeamId: number, currentDay: number) {
        // Cette fonction peut rester pour vider d'éventuels résidus 
        // ou nettoyer des news, mais le gros du travail est fait par clearLiveMatchLogs
        await NewsService.cleanupOldNews(saveId, currentDay);
    }
};