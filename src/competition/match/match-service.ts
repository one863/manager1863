import { generateSeasonFixtures } from "@/core/generators/league-templates";
import { type Match, type Player, type Team, db } from "@/core/db/db";
import { FORMATIONS } from "@/core/tactics";
import type { MatchResult, MatchEvent } from "@/core/types";
import { ClubService } from "@/club/club-service";
import { NewsService } from "@/news/service/news-service";
import { randomInt, clamp } from "@/core/utils/math";
import i18next from "i18next";
import { UpdateTeamSchema } from "@/core/domain";
import { validateOrThrow } from "@/core/validation/zod-utils";

const simulationWorker = new Worker(
	new URL("../../core/engine/simulation.worker.ts", import.meta.url),
	{ type: "module" },
);

const runMatchInWorker = (matchData: any, language: string): Promise<MatchResult> => {
	return new Promise((resolve, reject) => {
        const requestId = Math.random().toString(36).substring(7);
        
        const timeout = setTimeout(() => {
            simulationWorker.removeEventListener("message", handler);
            reject(new Error("MATCH_SIMULATION_TIMEOUT"));
        }, 15000);

		const cleanPayload = JSON.parse(JSON.stringify({ ...matchData, requestId, language }));
        
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
		simulationWorker.postMessage({ type: "SIMULATE_MATCH", payload: cleanPayload });
	});
};

export const MatchService = {
	async hasUserMatchToday(saveId: number, day: number, userTeamId: number): Promise<boolean> {
		const match = await db.matches.where("[saveId+day]").equals([saveId, day])
			.and((m) => (m.homeTeamId === userTeamId || m.awayTeamId === userTeamId) && !m.played).first();
		return !!match;
	},

	async simulateDayByDay(saveId: number, day: number, userTeamId: number, date: Date): Promise<any> {
		const todaysMatches = await db.matches.where("[saveId+day]").equals([saveId, day]).toArray();
		const userMatch = todaysMatches.find((m) => (m.homeTeamId === userTeamId || m.awayTeamId === userTeamId) && !m.played);
		const otherMatches = todaysMatches.filter((m) => !m.played && m.homeTeamId !== userTeamId && m.awayTeamId !== userTeamId);
		const allPlayers = await db.players.where("saveId").equals(saveId).toArray();
		const playersByTeam = allPlayers.reduce((acc, player) => {
			if (!acc[player.teamId]) acc[player.teamId] = [];
			acc[player.teamId].push(player); return acc;
		}, {} as Record<number, Player[]>);

		if (otherMatches.length > 0) {
			const matchesToSimulate = [];
			for (const match of otherMatches) {
				const homePlayers = playersByTeam[match.homeTeamId] || [];
				const awayPlayers = playersByTeam[match.awayTeamId] || [];
				const [homeT, awayT, homeStaff, awayStaff] = await Promise.all([
					db.teams.get(match.homeTeamId), db.teams.get(match.awayTeamId),
					db.staff.where("[saveId+teamId]").equals([saveId, match.homeTeamId]).toArray(),
					db.staff.where("[saveId+teamId]").equals([saveId, match.awayTeamId]).toArray()
				]);
				matchesToSimulate.push({ matchId: match.id, homeTeamId: match.homeTeamId, awayTeamId: match.awayTeamId, homePlayers, awayPlayers, homeName: homeT?.name, awayName: awayT?.name, homeStaff, awayStaff, hTactic: homeT?.tacticType, aTactic: awayT?.tacticType });
			}
			this.runBatchSimulation(matchesToSimulate, saveId, date);
		}

		if (userMatch) {
			const homePlayers = playersByTeam[userMatch.homeTeamId] || [];
			const awayPlayers = playersByTeam[userMatch.awayTeamId] || [];
			const [homeT, awayT, homeStaff, awayStaff] = await Promise.all([
				db.teams.get(userMatch.homeTeamId), db.teams.get(userMatch.awayTeamId),
				db.staff.where("[saveId+teamId]").equals([saveId, userMatch.homeTeamId]).toArray(),
				db.staff.where("[saveId+teamId]").equals([saveId, userMatch.awayTeamId]).toArray()
			]);
			const matchData = { matchId: userMatch.id, homeTeamId: userMatch.homeTeamId, awayTeamId: userMatch.awayTeamId, homePlayers, awayPlayers, homeName: homeT?.name, awayName: awayT?.name, homeStaff, awayStaff, hTactic: homeT?.tacticType, aTactic: awayT?.tacticType };
            const result = await runMatchInWorker(matchData, i18next.language);

            return { matchId: userMatch.id!, homeTeam: homeT, awayTeam: awayT, homePlayers, awayPlayers, result };
		}
		return null;
	},

	runBatchSimulation(matches: any[], saveId: number, date: Date) {
		const language = i18next.language;
		simulationWorker.postMessage({ type: "SIMULATE_BATCH", payload: { matches, saveId, language } });
		const handler = async (e: MessageEvent) => {
			const { type, payload } = e.data;
			if (type === "BATCH_COMPLETE" && payload.saveId === saveId) {
				simulationWorker.removeEventListener("message", handler);
				for (const res of payload.results) {
					const match = await db.matches.get(res.matchId);
					if (match) await this.saveMatchResult(match, res.result, saveId, date, false, false);
				}
			}
		};
		simulationWorker.addEventListener("message", handler);
	},

	async saveMatchResult(match: Match, result: MatchResult, saveId: number, date: Date, generateNews = true, _isUserMatch = false) {
        const currentMatch = await db.matches.get(match.id!);
        if (currentMatch?.played) return;

        // Stocker uniquement : scores, stats, notes (ratings), buteurs
        // Aucun texte, aucun log, aucun event détaillé
        const resultToSave = { 
            matchId: result.matchId,
            homeTeamId: result.homeTeamId,
            awayTeamId: result.awayTeamId,
            homeScore: result.homeScore, 
            awayScore: result.awayScore, 
            stats: result.stats,
            scorers: (result as any).scorers,
            ratings: (result as any).ratings,
            stoppageTime: result.stoppageTime,
            events: [],
            debugLogs: [],
            ballHistory: []
        };

		await db.matches.where("id").equals(match.id!).modify({ homeScore: result.homeScore, awayScore: result.awayScore, played: true, details: resultToSave });
		await Promise.all([
            this.updateTeamStats(match.homeTeamId, result.homeScore, result.awayScore), 
            this.updateTeamStats(match.awayTeamId, result.awayScore, result.homeScore),
            ClubService.processSuspensions(saveId, match.homeTeamId), 
            ClubService.processSuspensions(saveId, match.awayTeamId)
        ]);
		if (generateNews) await NewsService.generateMatchNews(saveId, date, match.homeTeamId, match.awayTeamId, result.homeScore, result.awayScore);
	},

	async updateTeamStats(teamId: number, goalsFor: number, goalsAgainst: number) {
		const team = await db.teams.get(teamId);
		if (!team) return;

		let pts = team.points || 0;
		let wins = team.wins || 0;
		let draws = team.draws || 0;
		let losses = team.losses || 0;

		if (goalsFor > goalsAgainst) {
			pts += 3;
			wins += 1;
		} else if (goalsFor < goalsAgainst) {
			losses += 1;
		} else {
			draws += 1;
		}

		// Validation avant update
		const teamUpdate = validateOrThrow(
			UpdateTeamSchema,
			{
				matchesPlayed: (team.matchesPlayed || 0) + 1,
				points: pts,
				wins,
				draws,
				losses,
				goalsFor: (team.goalsFor || 0) + goalsFor,
				goalsAgainst: (team.goalsAgainst || 0) + goalsAgainst,
				goalDifference: (team.goalsFor || 0) + goalsFor - ((team.goalsAgainst || 0) + goalsAgainst),
			},
			"MatchService.updateTeamStats",
		) as Partial<Team>;

		await db.teams.update(teamId, teamUpdate);
	},

	/**
	 * Optimise les détails d'un match pour le stockage (supprime les données volumineuses non essentielles)
	 */
	optimizeMatchDetailsForStorage(result: MatchResult): MatchResult {
		return {
			...result,
			// Garder les logs mais sans les données volumineuses (zoneInfluences, bag complet)
			debugLogs: result.debugLogs?.map((log: any) => ({
				time: log.time,
				type: log.type,
				text: log.text,
				eventSubtype: log.eventSubtype,
				playerName: log.playerName,
				teamId: log.teamId,
				possessionTeamId: log.possessionTeamId,
				ballPosition: log.ballPosition,
				// Ne pas inclure: bag, zoneInfluences, drawnToken, statImpact
			})) || [],
			// Réduire ballHistory à 50 points au lieu de 100
			ballHistory: result.ballHistory?.filter((_: any, i: number) => i % 2 === 0) || []
		};
	},

	/**
	 * Nettoie les logs des anciens matchs utilisateur pour réduire la taille de la sauvegarde
	 * Garde seulement les événements importants (buts, cartons, penalties)
	 */
	async cleanupOldUserMatchLogs(saveId: number, userTeamId: number, currentDay: number) {
		// Ne garder les logs complets que pour les 3 derniers jours
		const cutoffDay = currentDay - 3;
		const oldUserMatches = await db.matches
			.where("saveId").equals(saveId)
			.and((m) => m.played && m.day < cutoffDay && (m.homeTeamId === userTeamId || m.awayTeamId === userTeamId))
			.toArray();
		
		for (const match of oldUserMatches) {
			if (match.details?.debugLogs && match.details.debugLogs.length > 10) {
				// Garder seulement les événements importants (max 20 logs)
				const importantLogs = match.details.debugLogs.filter((log: any) => 
					['GOAL', 'CARD', 'PENALTY', 'INJURY', 'SAVE', 'WOODWORK'].includes(log.eventSubtype) || log.type === 'EVENT'
				).slice(0, 20);
				await db.matches.update(match.id!, {
					details: {
						matchId: match.details.matchId,
						homeTeamId: match.details.homeTeamId,
						awayTeamId: match.details.awayTeamId,
						homeScore: match.details.homeScore,
						awayScore: match.details.awayScore,
						stats: match.details.stats,
						scorers: (match.details as any).scorers,
						ratings: (match.details as any).ratings,
						events: match.details.events,
						debugLogs: importantLogs,
						ballHistory: []
					}
				});
			}
		}
	},

	/**
	 * Vérifie la fin de saison et, si demandé, réinitialise les stats des équipes et génère les nouveaux matchs.
	 * @param saveId
	 * @param userLeagueId
	 * @param resetStats Si true, reset les stats et génère les fixtures (début de nouvelle saison)
	 */
	async checkSeasonEnd(saveId: number, userLeagueId: number, resetStats = false) {
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
				   await db.history.add({ saveId, teamId: t.id!, seasonYear: state.season, leagueName: league.name, position: i + 1, points: t.points || 0, goalsFor: t.goalsFor || 0, goalsAgainst: t.goalsAgainst || 0 });
			   }
		   }
		   if (resetStats) {
			   // Supprimer uniquement les matchs IA vs IA, garder les matchs de l'utilisateur
			   const userTeamId = state.userTeamId;
			   await db.matches.where("saveId").equals(saveId)
				   .and((m) => m.homeTeamId !== userTeamId && m.awayTeamId !== userTeamId)
				   .delete();
			   for (const league of allLeagues) {
				   const currentTeams = await db.teams.where("leagueId").equals(league.id!).toArray();
				   const teamIds = currentTeams.map((t) => t.id!);
				   for (const t of currentTeams) await db.teams.update(t.id!, { points: 0, matchesPlayed: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, wins: 0, draws: 0, losses: 0 });
				   await generateSeasonFixtures(saveId, league.id!, teamIds);
			   }
		   }
		   return true;
	   },
};
