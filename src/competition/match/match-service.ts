import { generateSeasonFixtures } from "@/core/generators/league-templates";
import { type Match, type Player, type Team, db } from "@/core/db/db";
import { FORMATIONS } from "@/core/engine/core/tactics";
import type { MatchResult } from "@/core/engine/core/types";
import { ClubService } from "@/club/club-service";
import { NewsService } from "@/news/service/news-service";
import { TrainingService } from "@/squad/training/training-service";
import { randomInt, clamp } from "@/core/utils/math";
import i18next from "i18next";

const simulationWorker = new Worker(
	new URL("../../core/engine/simulation.worker.ts", import.meta.url),
	{ type: "module" },
);

const runMatchInWorker = (matchData: any, language: string): Promise<MatchResult> => {
	return new Promise((resolve, reject) => {
		const requestId = Math.random().toString(36).substring(7);
        const cleanPayload = JSON.parse(JSON.stringify({ ...matchData, requestId, language }));
        
		const handler = (e: MessageEvent) => {
			const { type, payload } = e.data;
			if ((type === "MATCH_COMPLETE" || type === "MATCH_ERROR") && payload.requestId === requestId) {
				simulationWorker.removeEventListener("message", handler);
                if (type === "MATCH_ERROR") {
                    console.error("Simulation worker error:", payload.error);
                    reject(new Error(payload.error));
                } else {
                    resolve(payload.result);
                }
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

	async autoSelectStarters(saveId: number, teamId: number, currentPlayers: Player[]) {
		const currentStarters = currentPlayers.filter((p) => p.isStarter);
		if (currentStarters.length >= 11) return;
        
		const [coach, team] = await Promise.all([
			db.staff.where("[saveId+teamId]").equals([saveId, teamId]).and((s) => s.role === "COACH").first(),
			db.teams.get(teamId),
		]);
		const managementLevel = coach?.stats?.management || 10.0;
		const formationKey = team?.formation || "4-4-2";
		const req = (FORMATIONS as any)[formationKey] || (FORMATIONS as any)["4-4-2"];
		const counts = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
		currentStarters.forEach((p) => { if (counts[p.position] !== undefined) counts[p.position]++; });
		const needed = { GK: Math.max(0, (req.GK || 0) - counts.GK), DEF: Math.max(0, (req.DEF || 0) - counts.DEF), MID: Math.max(0, (req.MID || 0) - counts.MID), FWD: Math.max(0, (req.FWD || 0) - counts.FWD) };
		
        let available = currentPlayers.filter((p) => !p.isStarter && p.injuryDays <= 0 && p.suspensionMatches <= 0);
		
        const PICK_STARTERS = (pos: "GK" | "DEF" | "MID" | "FWD", count: number) => {
			let candidates = available.filter((p) => p.position === pos).sort((a, b) => b.skill - a.skill);
			if (candidates.length < count) { candidates = [...candidates, ...available.filter((p) => p.position !== pos).sort((a, b) => b.skill - a.skill)]; }
			for (let i = 0; i < count; i++) {
				if (candidates.length === 0) break;
				const pickIndex = randomInt(0, Math.min(candidates.length - 1, Math.floor(candidates.length * (1 - managementLevel / 20))));
				const picked = candidates[pickIndex];
				picked.isStarter = true;
				available = available.filter((p) => p.id !== picked.id);
				candidates.splice(pickIndex, 1);
			}
		};
		PICK_STARTERS("GK", needed.GK); PICK_STARTERS("DEF", needed.DEF); PICK_STARTERS("MID", needed.MID); PICK_STARTERS("FWD", needed.FWD);
		
        // Sauvegarder en DB
        const startersToUpdate = currentPlayers.filter(p => p.isStarter).map(p => p.id!);
        if (startersToUpdate.length > 0) {
            await db.players.where("id").anyOf(startersToUpdate).modify({ isStarter: true });
        }
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
				await this.autoSelectStarters(saveId, match.homeTeamId, homePlayers);
				await this.autoSelectStarters(saveId, match.awayTeamId, awayPlayers);
				const [homeT, awayT, homeStaff, awayStaff] = await Promise.all([
					db.teams.get(match.homeTeamId), db.teams.get(match.awayTeamId),
					db.staff.where("[saveId+teamId]").equals([saveId, match.homeTeamId]).toArray(),
					db.staff.where("[saveId+teamId]").equals([saveId, match.awayTeamId]).toArray()
				]);
				matchesToSimulate.push({ matchId: match.id, homeTeamId: match.homeTeamId, awayTeamId: match.awayTeamId, homePlayers, awayPlayers, homeName: homeT?.name, awayName: awayT?.name, homeStaff, awayStaff, hIntensity: 3, aIntensity: 3, hTactic: homeT?.tacticType, aTactic: awayT?.tacticType, homeCohesion: homeT?.teamCohesion, awayCohesion: awayT?.teamCohesion });
			}
			this.runBatchSimulation(matchesToSimulate, saveId, date, userTeamId);
		}

		if (userMatch) {
			const homePlayers = playersByTeam[userMatch.homeTeamId] || [];
			const awayPlayers = playersByTeam[userMatch.awayTeamId] || [];
			await this.autoSelectStarters(saveId, userMatch.homeTeamId, homePlayers);
			await this.autoSelectStarters(saveId, userMatch.awayTeamId, awayPlayers);
			const [homeT, awayT, homeStaff, awayStaff] = await Promise.all([
				db.teams.get(userMatch.homeTeamId), db.teams.get(userMatch.awayTeamId),
				db.staff.where("[saveId+teamId]").equals([saveId, userMatch.homeTeamId]).toArray(),
				db.staff.where("[saveId+teamId]").equals([saveId, userMatch.awayTeamId]).toArray()
			]);
			const matchData = { homeTeamId: userMatch.homeTeamId, awayTeamId: userMatch.awayTeamId, homePlayers, awayPlayers, homeName: homeT?.name, awayName: awayT?.name, homeStaff, awayStaff, hIntensity: 3, aIntensity: 3, hTactic: homeT?.tacticType, aTactic: awayT?.tacticType, homeCohesion: homeT?.teamCohesion, awayCohesion: awayT?.teamCohesion };
            const result = await runMatchInWorker(matchData, i18next.language);
            
            if (!result) throw new Error("Simulation returned empty result");

            await this.saveMatchResult(userMatch, result, saveId, date, true, true);
            return { matchId: userMatch.id!, homeTeam: homeT, awayTeam: awayT, homePlayers, awayPlayers, result };
		}
		return null;
	},

	runBatchSimulation(matches: any[], saveId: number, date: Date, userTeamId: number) {
		const language = i18next.language;
        const cleanPayload = JSON.parse(JSON.stringify({ matches, saveId, language }));
		simulationWorker.postMessage({ type: "SIMULATE_BATCH", payload: cleanPayload });
		const handler = async (e: MessageEvent) => {
			const { type, payload } = e.data;
			if (type === "BATCH_COMPLETE" && payload.saveId === saveId) {
				simulationWorker.removeEventListener("message", handler);
				for (const res of payload.results) {
					const match = await db.matches.get(res.matchId);
					if (match) await this.saveMatchResult(match, res.result, saveId, date, false, (match.homeTeamId === userTeamId || match.awayTeamId === userTeamId));
				}
			}
		};
		simulationWorker.addEventListener("message", handler);
	},

	async saveMatchResult(match: Match, result: MatchResult, saveId: number, date: Date, generateNews = true, keepDetails = true) {
        const resultToSave = keepDetails ? result : { ...result, events: result.events.filter(e => ["GOAL", "CARD", "INJURY"].includes(e.type)), debugLogs: [], ballHistory: [] };
		await db.matches.where("id").equals(match.id!).modify({ homeScore: result.homeScore, awayScore: result.awayScore, played: true, details: JSON.parse(JSON.stringify(resultToSave)) });
		await Promise.all([this.updateTeamStats(match.homeTeamId, result.homeScore, result.awayScore), this.updateTeamStats(match.awayTeamId, result.awayScore, result.homeScore), this.applyMatchStatsAndFatigue(match.homeTeamId, saveId, result), this.applyMatchStatsAndFatigue(match.awayTeamId, saveId, result), this.processMatchIncidents(result, saveId), ClubService.processSuspensions(saveId, match.homeTeamId), ClubService.processSuspensions(saveId, match.awayTeamId)]);
		if (generateNews) await NewsService.generateMatchNews(saveId, date, match.homeTeamId, match.awayTeamId, result.homeScore, result.awayScore);
	},

	async applyMatchStatsAndFatigue(teamId: number, saveId: number, result: MatchResult) {
		const players = await db.players.where("[saveId+teamId]").equals([saveId, teamId]).toArray();
		for (const player of players) {
            const playerStats = result.playerStats?.[player.id!.toString()];
			if (playerStats) {
				const matchRating = playerStats.rating || 6.0;
				const newRatings = [matchRating, ...(player.lastRatings || [])].slice(0, 5);
				const sStats = player.seasonStats || { matches: 0, goals: 0, assists: 0, avgRating: 0, xg: 0, xa: 0, distance: 0, duelsWinRate: 0, passAccuracy: 0 };
				
                const n = sStats.matches; sStats.matches += 1;
                sStats.goals += (playerStats.goals || 0); sStats.assists += (playerStats.assists || 0);
                sStats.xg += (playerStats.xg || 0); sStats.xa += (playerStats.xa || 0);
                sStats.distance += (playerStats.distance || 0); 
                sStats.avgRating = (sStats.avgRating * n + matchRating) / sStats.matches;
                sStats.passAccuracy = (sStats.passAccuracy * n + (playerStats.passes > 0 ? (playerStats.passesSuccess || 0) / (playerStats.passes || 1) : 0.8)) / sStats.matches;
                sStats.duelsWinRate = (sStats.duelsWinRate * n + (playerStats.duels > 0 ? (playerStats.duelsWon || 0) / (playerStats.duels || 1) : 0.5)) / sStats.matches;

                // Appliquer la fatigue réelle du match à l'énergie du joueur
                const finalEnergy = Math.max(0, 100 - (playerStats.fatigue || 0));
                
				await db.players.update(player.id!, { 
                    energy: finalEnergy, 
                    condition: Math.max(10, (player.condition || 100) - randomInt(1, 4)), 
                    playedThisWeek: true, 
                    lastRatings: newRatings, 
                    seasonStats: sStats, 
                    confidence: clamp((player.confidence || 50) + (matchRating - 6.0) * 2, 0, 100) 
                });
			} else { 
                // Pour les joueurs n'ayant pas joué, on réinitialise leur note de match et on récupère un peu d'énergie (training/repos)
                await db.players.update(player.id!, { 
                    confidence: clamp((player.confidence || 50) - 1, 0, 100),
                    energy: Math.min(100, (player.energy || 100) + 5) // Petit gain d'énergie pour ceux qui ne jouent pas
                }); 
            }
		}
	},

	async processMatchIncidents(result: MatchResult, saveId: number) {
		const events = result.events.filter(e => e.type === "INJURY" || e.type === "CARD");
		for (const event of events) {
			if (!event.playerId) continue;
			const player = await db.players.get(event.playerId);
			if (!player) continue;
			if (event.type === "INJURY") await db.players.update(player.id!, { injuryDays: (player.injuryDays || 0) + (event.duration || 1), condition: Math.max(5, (player.condition || 100) - randomInt(10, 30)), isStarter: false, confidence: Math.max(0, (player.confidence || 50) - 10) });
			else if (event.type === "CARD" && (event.duration || 0) > 0) await db.players.update(player.id!, { suspensionMatches: (player.suspensionMatches || 0) + (event.duration || 1), isStarter: false, confidence: Math.max(0, (player.confidence || 50) - 5) });
		}
	},

	async updateTeamStats(teamId: number, goalsFor: number, goalsAgainst: number) {
		const team = await db.teams.get(teamId);
		if (!team) return;
		let pts = team.points || 0; let wins = team.wins || 0; let draws = team.draws || 0; let losses = team.losses || 0; let resVal = 0.5; 
		if (goalsFor > goalsAgainst) { pts += 3; wins += 1; resVal = 1; } else if (goalsFor < goalsAgainst) { losses += 1; resVal = 0; } else { draws += 1; }
		await db.teams.update(teamId, { matchesPlayed: (team.matchesPlayed || 0) + 1, points: pts, wins, draws, losses, goalsFor: (team.goalsFor || 0) + goalsFor, goalsAgainst: (team.goalsAgainst || 0) + goalsAgainst, goalDifference: ((team.goalsFor || 0) + goalsFor) - ((team.goalsAgainst || 0) + goalsAgainst), lastResults: [resVal, ...(team.lastResults || [])].slice(0, 5) });
	},

	async checkSeasonEnd(saveId: number, userLeagueId: number) {
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
				const players = await db.players.where("[saveId+teamId]").equals([saveId, t.id!]).toArray();
				let top = players[0];
				for (const p of players) { if ((p.seasonStats?.goals || 0) > (top?.seasonStats?.goals || 0)) top = p; }
				await db.history.add({ saveId, teamId: t.id!, seasonYear: state.season, leagueName: league.name, position: i + 1, points: t.points || 0, goalsFor: t.goalsFor || 0, goalsAgainst: t.goalsAgainst || 0, budget: t.budget || 0, topScorerName: top ? `${top.firstName} ${top.lastName}` : "N/A", topScorerGoals: top?.seasonStats?.goals || 0, achievements: i === 0 ? ["Champion"] : [] });
				for (const p of players) await db.players.update(p.id!, { seasonStats: { matches: 0, goals: 0, assists: 0, avgRating: 0, xg: 0, xa: 0, distance: 0, duelsWinRate: 0, passAccuracy: 0 } });
			}
		}
		await db.news.where("saveId").equals(saveId).delete();
		await db.matches.where("saveId").equals(saveId).delete();
		for (const league of allLeagues) {
			const currentTeams = await db.teams.where("leagueId").equals(league.id!).toArray();
			const teamIds = currentTeams.map((t) => t.id!);
			for (const t of currentTeams) await db.teams.update(t.id!, { points: 0, matchesPlayed: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, wins: 0, draws: 0, losses: 0 });
			await generateSeasonFixtures(saveId, league.id!, teamIds);
		}
		return true;
	},
};
