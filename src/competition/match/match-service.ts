import { generateSeasonFixtures } from "@/core/generators/league-templates";
import { type Match, type Player, type Team, db } from "@/core/db/db";
import { type MatchResult } from "@/core/types";
import { ClubService } from "@/club/club-service";
import { NewsService } from "@/news/service/news-service";
import i18next from "i18next";
import { UpdateTeamSchema } from "@/core/domain";
import { validateOrThrow } from "@/core/validation/zod-utils";


/**
 * Exécute une simulation unique via le nouveau Worker (match-simulation.worker.ts)
 */
const runMatchInWorker = (matchData: any, language: string): Promise<MatchResult> => {
    return new Promise((resolve, reject) => {
        // On utilise le nouveau worker dédié à la simulation de journée
        const worker = new Worker(new URL("../../competition/match/match-simulation.worker.ts", import.meta.url), { type: "module" });
        // On adapte le protocole pour simuler un seul match si besoin
        worker.postMessage({ ...matchData, language });
        worker.onmessage = (event) => {
            if (event.data.success) {
                resolve(event.data.result);
            } else {
                reject(event.data.error);
            }
            worker.terminate();
        };
        worker.onerror = (err) => {
            reject(err);
            worker.terminate();
        };
    });
};

export const MatchService = {
        /**
         * Retourne le match utilisateur pour un jour donné (ou null si aucun)
         */
        getUserMatchForDay: async (saveId: number, userTeamId: number, day: number) => {
            const matches = await db.matches.where({ saveId, day }).toArray();
            console.log('[getUserMatchForDay] all matches for day', day, matches.map(m => ({id: m.id, home: m.homeTeamId, away: m.awayTeamId, played: m.played, leagueId: m.leagueId})));
            return matches.find(m => (m.homeTeamId === userTeamId || m.awayTeamId === userTeamId) && m.leagueId) || null;
        },
    /**
     * Simule tous les matchs d'une journée. 
     * Gère le match utilisateur à part pour permettre le mode "Live".
     */
    simulateDayByDay: async (saveId: number, day: number, userTeamId: number, date: Date): Promise<any> => {
        console.debug(`[MatchService] Simulation Journée ${day}`);


        // 1. Récupération des données
        let todaysMatches = await db.matches.where("[saveId+day]").equals([saveId, day]).toArray();
        const allPlayers = await db.players.where("saveId").equals(saveId).toArray();

        // Groupement des joueurs par équipe
        const playersByTeam = allPlayers.reduce((acc, player) => {
            if (!acc[player.teamId]) acc[player.teamId] = [];
            acc[player.teamId].push(player); 
            return acc;
        }, {} as Record<number, Player[]>);

        // 2. Identification du match utilisateur et des matchs IA
        const userMatch = todaysMatches.find(m => !m.played && (Number(m.homeTeamId) === userTeamId || Number(m.awayTeamId) === userTeamId));
        console.debug('[simulateDayByDay] userMatch', userMatch);
        const otherMatches = todaysMatches.filter(m => !m.played && m.id !== userMatch?.id);

        // 3. Simulation des matchs IA (Batch)
        if (otherMatches.length > 0) {
            const batchPayload = await Promise.all(otherMatches.map(async (m) => {
                const [hT, aT] = await Promise.all([db.teams.get(m.homeTeamId), db.teams.get(m.awayTeamId)]);
                return {
                    matchId: m.id,
                    homeTeamId: m.homeTeamId, awayTeamId: m.awayTeamId,
                    homePlayers: playersByTeam[m.homeTeamId] || [],
                    awayPlayers: playersByTeam[m.awayTeamId] || [],
                    homeName: hT?.name, awayName: aT?.name
                };
            }));
            // Correction : on attend bien la fin de la simulation batch IA vs IA
            await MatchService.runBatchSimulation(batchPayload, saveId, date);
        }

        // 4. Simulation du match utilisateur (pour le mode Live)
        if (userMatch) {
            const [homeT, awayT] = await Promise.all([db.teams.get(userMatch.homeTeamId), db.teams.get(userMatch.awayTeamId)]);
            try {
                const result = await runMatchInWorker({
                    matchId: userMatch.id,
                    homeTeamId: userMatch.homeTeamId, 
                    awayTeamId: userMatch.awayTeamId,
                    homePlayers: playersByTeam[userMatch.homeTeamId] || [],
                    awayPlayers: playersByTeam[userMatch.awayTeamId] || [],
                    homeName: homeT?.name, 
                    awayName: awayT?.name
                }, i18next.language);

                // Sauvegarde des logs détaillés pour la lecture différée (MatchLive)
                await db.matchLogs.put({
                    saveId,
                    matchId: userMatch.id!,
                    debugLogs: result.events || [], // On stocke les événements formatés
                    events: result.events || [],
                    ballHistory: result.ballHistory || []
                });

                return {
                    matchId: userMatch.id!,
                    homeTeam: homeT,
                    awayTeam: awayT,
                    homePlayers: playersByTeam[userMatch.homeTeamId] || [],
                    awayPlayers: playersByTeam[userMatch.awayTeamId] || [],
                    result
                };
            } catch (e) {
                console.error('[simulateDayByDay] Erreur simulation match utilisateur', e);
                // On retourne un objet vide pour éviter les nulls
                return {
                    matchId: userMatch.id!,
                    homeTeam: homeT,
                    awayTeam: awayT,
                    homePlayers: playersByTeam[userMatch.homeTeamId] || [],
                    awayPlayers: playersByTeam[userMatch.awayTeamId] || [],
                    result: null
                };
            }
        }
                // Vérification stricte des paramètres
                if (typeof saveId !== 'number' || typeof day !== 'number' || isNaN(saveId) || isNaN(day)) {
                    throw new Error(`[simulateDayByDay] saveId ou day invalide : saveId=${saveId}, day=${day}`);
                }
                // (suppression de la redéclaration inutile de todaysMatches)
        return {
            matchId: null,
            homeTeam: null,
            awayTeam: null,
            homePlayers: [],
            awayPlayers: [],
            result: null
        };
    },

    /**
     */
    runBatchSimulation: async (matches: any[], saveId: number, date: Date) => {
        return new Promise<void>((resolve) => {
            const worker = new Worker(new URL("../../competition/match/match-simulation.worker.ts", import.meta.url), { type: "module" });
            worker.postMessage({ 
                type: "SIMULATE_BATCH", 
                payload: { matches, saveId, language: i18next.language } 
            });

            const handler = async (e: MessageEvent) => {
                const { type, payload } = e.data;
                if (type === "BATCH_COMPLETE" && payload.saveId === saveId) {
                    worker.removeEventListener("message", handler);
                    worker.terminate();
                    // 1. Transaction : on ne fait que la persistance des résultats (pas de news)
                    await db.transaction('rw', [db.matches, db.teams, db.players], async () => {
                        for (const res of payload.results) {
                            const m = await db.matches.get(res.matchId);
                            if (m && !m.played) {
                                // On passe generateNews = false pour ne pas générer de news ici
                                await MatchService.saveMatchResult(m, res.result, saveId, date, false);
                            }
                        }
                    });
                    // 2. Génération des news en dehors de la transaction
                    for (const res of payload.results) {
                        const m = await db.matches.get(res.matchId);
                        if (m) {
                            await NewsService.generateMatchNews(saveId, date, m.homeTeamId, m.awayTeamId, res.result.homeScore, res.result.awayScore);
                        }
                    }
                    resolve();
                }
            };
            worker.addEventListener("message", handler);
        });
    },

    /**
     * Persistance finale d'un résultat de match.
     */
    saveMatchResult: async (match: Match, result: MatchResult, saveId: number, date: Date, generateNews = true) => {
        // 1. Préparation du résumé léger pour la table 'matches'
        const lightDetails: MatchResult = {
            matchId: match.id!,
            homeTeamId: match.homeTeamId,
            awayTeamId: match.awayTeamId,
            homeScore: result.homeScore,
            awayScore: result.awayScore,
            events: [],
            stats: result.stats ?? {},
            ballHistory: [],
            stoppageTime: result.stoppageTime || 0,
            scorers: result.scorers ?? [],
            ratings: result.ratings ?? []
        };

        // 2. Mise à jour du match
        await db.matches.update(match.id!, { 
            homeScore: result.homeScore, 
            awayScore: result.awayScore, 
            played: true, 
            details: lightDetails 
        });
        // 3. Mise à jour des stats d'équipes (Classement)
        await Promise.all([
            MatchService.updateTeamStats(match.homeTeamId, result.homeScore, result.awayScore), 
            MatchService.updateTeamStats(match.awayTeamId, result.awayScore, result.homeScore)
        ]);

        // 4. MISE À JOUR DES STATS JOUEURS (Agrégation via StatTracker)
        // On accepte un champ additionnel playerStats dans le résultat du moteur
        const playerStats = (result as any).playerStats;
        if (playerStats) {
            await MatchService.persistPlayerStats(saveId, playerStats);
        }

        // 5. Génération des actualités
        if (generateNews) {
            await NewsService.generateMatchNews(saveId, date, match.homeTeamId, match.awayTeamId, result.homeScore, result.awayScore);
        }
    },

    /**
     * Cumule les statistiques de match dans le profil permanent des joueurs.
     */
    persistPlayerStats: async (saveId: number, playerStats: Record<number, any>) => {
        for (const [playerId, stats] of Object.entries(playerStats)) {
            const id = Number(playerId);
            const player = await db.players.get(id);
            if (!player) continue;

            // Sécurité : initialisation de player.stats si absent
            if (!player.stats) {
                player.stats = { technical: 0, finishing: 0, defense: 0, physical: 0, mental: 0, goalkeeping: 0 };
            }

            // On cumule dans seasonStats (buts, passes, matchs)
            const currentSeason = player.seasonStats || { matches: 0, goals: 0, assists: 0, avgRating: 0, xg: 0, xa: 0, distance: 0, duelsWinRate: 0, passAccuracy: 0 };
            await db.players.update(id, {
                stats: player.stats,
                seasonStats: {
                    ...currentSeason,
                    goals: (currentSeason.goals || 0) + (stats.goals || 0),
                    assists: (currentSeason.assists || 0) + (stats.assists || 0),
                    matches: (currentSeason.matches || 0) + 1,
                    // Ajoute d'autres stats si besoin
                }
            });
        }
    },

    /**
     * Met à jour le classement (Points, buts, etc.)
     */
    updateTeamStats: async (teamId: number, goalsFor: number, goalsAgainst: number) => {
        const team = await db.teams.get(teamId);
        if (!team) return;

        let { points: pts = 0, wins = 0, draws = 0, losses = 0 } = team;
        if (goalsFor > goalsAgainst) { pts += 3; wins += 1; }
        else if (goalsFor < goalsAgainst) { losses += 1; }
        else { pts += 1; draws += 1; }

        const update = validateOrThrow(UpdateTeamSchema, {
            matchesPlayed: (team.matchesPlayed || 0) + 1,
            points: pts, wins, draws, losses,
            goalsFor: (team.goalsFor || 0) + goalsFor,
            goalsAgainst: (team.goalsAgainst || 0) + goalsAgainst,
            goalDifference: (team.goalsFor || 0) + goalsFor - ((team.goalsAgainst || 0) + goalsAgainst),
        }, "MatchService.updateTeamStats");

        await db.teams.update(teamId, update as any);
    },


    /**
     * Vérifie si la saison est terminée.
     * @param saveId Identifiant de sauvegarde
     * @returns Promise<boolean>
     */
    /**
     * Vérifie si tous les matchs de championnat de la saison courante sont joués.
     */
    checkSeasonEnd: async (saveId: number): Promise<boolean> => {
        const gameState = await db.gameState.where("saveId").equals(saveId).first();
        if (!gameState) return false;
        const season = gameState.season;
        // On ne prend que les matchs de championnat (leagueId défini)
        const matches = await db.matches.where({ saveId }).toArray();
        const leagueMatches = matches.filter(m => m.leagueId);
        return leagueMatches.length > 0 && leagueMatches.every(m => m.played);
    },
    // Nettoie les anciens logs de matchs utilisateurs pour un slot de sauvegarde donné
    // Supprime tous les logs de match pour un slot de sauvegarde donné (après un live)
    cleanupOldUserMatchLogs: async (saveId: number) => {
        const allLogs = await db.matchLogs.where("saveId").equals(saveId).toArray();
        const idsToDelete = allLogs.map(log => log.id).filter(Boolean);
        if (idsToDelete.length > 0) {
            await db.matchLogs.bulkDelete(idsToDelete);
            console.debug(`[MatchService] cleanupOldUserMatchLogs: ${idsToDelete.length} logs supprimés pour saveId=${saveId}`);
        }
    },
};