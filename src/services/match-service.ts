import { generateSeasonFixtures } from "@/data/league-templates";
import { type Match, type Player, type Team, type StaffMember, db } from "@/db/db";
import { calculateTeamRatings } from "@/engine/converter";
import { FORMATIONS } from "@/engine/core/tactics";
import type { MatchResult, PlayerMatchStats } from "@/engine/core/types";
import { ClubService } from "@/services/club-service";
import { NewsService } from "./news-service";
import { randomInt } from "@/utils/math";
import i18next from "i18next";

const simulationWorker = new Worker(
	new URL("../engine/simulation.worker.ts", import.meta.url),
	{ type: "module" },
);

const runMatchInWorker = (matchData: any, language: string): Promise<MatchResult> => {
	return new Promise((resolve) => {
		const requestId = Math.random().toString(36).substring(7);
		const handler = (e: MessageEvent) => {
			const { type, payload } = e.data;
			if (type === "MATCH_COMPLETE" && payload.requestId === requestId) {
				simulationWorker.removeEventListener("message", handler);
				resolve(payload.result);
			}
		};
		simulationWorker.addEventListener("message", handler);
		simulationWorker.postMessage({ type: "SIMULATE_MATCH", payload: { ...matchData, requestId, language } });
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
		const newStartersIds: number[] = [];

		const pickForPos = (pos: "GK" | "DEF" | "MID" | "FWD", count: number) => {
			let candidates = available.filter((p) => p.position === pos).sort((a, b) => b.skill - a.skill);
			if (candidates.length < count) {
				const others = available.filter((p) => p.position !== pos).sort((a, b) => b.skill - a.skill);
				candidates = [...candidates, ...others];
			}
			for (let i = 0; i < count; i++) {
				if (candidates.length === 0) break;
				const errorMargin = Math.max(0, 1 - managementLevel / 20);
				const maxIndex = Math.min(candidates.length - 1, Math.floor(candidates.length * errorMargin));
				const pickIndex = randomInt(0, maxIndex);
				const picked = candidates[pickIndex];
				newStartersIds.push(picked.id!);
				// UPDATE IN-MEMORY ARRAY
				picked.isStarter = true;
				available = available.filter((p) => p.id !== picked.id);
				candidates.splice(pickIndex, 1);
			}
		};

		pickForPos("GK", needed.GK); pickForPos("DEF", needed.DEF); pickForPos("MID", needed.MID); pickForPos("FWD", needed.FWD);
		
		while (newStartersIds.length + currentStarters.length < 11 && available.length > 0) { 
			const p = available[0]; 
			p.isStarter = true;
			newStartersIds.push(p.id!); 
			available.shift(); 
		}

		if (newStartersIds.length > 0) {
			await db.players.where("id").anyOf(newStartersIds).modify({ isStarter: true });
		}
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

		// CPU Matches Simulation
		if (otherMatches.length > 0) {
			const matchesToSimulate = [];
			for (const match of otherMatches) {
				const homePlayers = playersByTeam[match.homeTeamId] || [];
				const awayPlayers = playersByTeam[match.awayTeamId] || [];
				
				// CRITICAL: autoSelectStarters now updates homePlayers/awayPlayers arrays directly
				await this.autoSelectStarters(saveId, match.homeTeamId, homePlayers);
				await this.autoSelectStarters(saveId, match.awayTeamId, awayPlayers);
				
				const [homeT, awayT, homeCoach, awayCoach] = await Promise.all([
					db.teams.get(match.homeTeamId), db.teams.get(match.awayTeamId),
					db.staff.where("[saveId+teamId]").equals([saveId, match.homeTeamId]).and(s => s.role === "COACH").first(),
					db.staff.where("[saveId+teamId]").equals([saveId, match.awayTeamId]).and(s => s.role === "COACH").first()
				]);

				const homeRatings = calculateTeamRatings(homePlayers, homeT?.tacticType || "NORMAL", homeCoach?.preferredStrategy || "BALANCED", saveId, date, homeCoach?.stats.tactical || 10.0, homeCoach?.preferredStrategy || "BALANCED");
				const awayRatings = calculateTeamRatings(awayPlayers, awayT?.tacticType || "NORMAL", awayCoach?.preferredStrategy || "BALANCED", saveId, date, awayCoach?.stats.tactical || 10.0, awayCoach?.preferredStrategy || "BALANCED");
				
				matchesToSimulate.push({
					matchId: match.id, homeRatings, awayRatings, homeTeamId: match.homeTeamId, awayTeamId: match.awayTeamId,
					homePlayers, awayPlayers, homeName: homeT?.name || "Home", awayName: awayT?.name || "Away",
					homeCoach: homeCoach ? { management: homeCoach.stats.management, tactical: homeCoach.stats.tactical, preferredStrategy: homeCoach.preferredStrategy } : undefined,
					awayCoach: awayCoach ? { management: awayCoach.stats.management, tactical: awayCoach.stats.tactical, preferredStrategy: awayCoach.preferredStrategy } : undefined
				});
			}
			this.runBatchSimulation(matchesToSimulate, saveId, date);
		}

		// User Match Simulation
		if (userMatch) {
			const homePlayers = playersByTeam[userMatch.homeTeamId] || [];
			const awayPlayers = playersByTeam[userMatch.awayTeamId] || [];
			await this.autoSelectStarters(saveId, userMatch.homeTeamId, homePlayers);
			await this.autoSelectStarters(saveId, userMatch.awayTeamId, awayPlayers);
			const [homeT, awayT, homeCoach, awayCoach] = await Promise.all([
				db.teams.get(userMatch.homeTeamId), db.teams.get(userMatch.awayTeamId),
				db.staff.where("[saveId+teamId]").equals([saveId, userMatch.homeTeamId]).and(s => s.role === "COACH").first(),
				db.staff.where("[saveId+teamId]").equals([saveId, userMatch.awayTeamId]).and(s => s.role === "COACH").first()
			]);
			const homeRatings = calculateTeamRatings(homePlayers, homeT?.tacticType || "NORMAL", homeCoach?.preferredStrategy || "BALANCED", saveId, date, homeCoach?.stats.tactical || 10.0, homeCoach?.preferredStrategy || "BALANCED");
			const awayRatings = calculateTeamRatings(awayPlayers, awayT?.tacticType || "NORMAL", awayCoach?.preferredStrategy || "BALANCED", saveId, date, awayCoach?.stats.tactical || 10.0, awayCoach?.preferredStrategy || "BALANCED");
			const matchData = {
				homeRatings, awayRatings, homeTeamId: userMatch.homeTeamId, awayTeamId: userMatch.awayTeamId,
				homePlayers, awayPlayers, homeName: homeT?.name || "Home", awayName: awayT?.name || "Away",
				homeCoach: homeCoach ? { management: homeCoach.stats.management, tactical: homeCoach.stats.tactical, preferredStrategy: homeCoach.preferredStrategy } : undefined,
				awayCoach: awayCoach ? { management: awayCoach.stats.management, tactical: awayCoach.stats.tactical, preferredStrategy: awayCoach.preferredStrategy } : undefined
			};
			const result = await runMatchInWorker(matchData, i18next.language);
			return { matchId: userMatch.id!, homeTeam: homeT, awayTeam: awayT, result };
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
					if (match) await this.saveMatchResult(match, res.result, saveId, date, false);
				}
			}
		};
		simulationWorker.addEventListener("message", handler);
	},

	async saveMatchResult(match: Match, result: MatchResult, saveId: number, date: Date, generateNews = true) {
		await db.matches.where("id").equals(match.id!).modify({
			homeScore: result.homeScore,
			awayScore: result.awayScore,
			played: true,
			details: JSON.parse(JSON.stringify(result))
		});

		await Promise.all([
			this.updateTeamStats(match.homeTeamId, result.homeScore, result.awayScore),
			this.updateTeamStats(match.awayTeamId, result.awayScore, result.homeScore),
			this.applyMatchStatsAndFatigue(match.homeTeamId, saveId, result),
			this.applyMatchStatsAndFatigue(match.awayTeamId, saveId, result),
			this.processMatchIncidents(result, saveId),
		]);

		if (generateNews) {
			await NewsService.generateMatchNews(saveId, date, match.homeTeamId, match.awayTeamId, result.homeScore, result.awayScore);
		}
	},

	async applyMatchStatsAndFatigue(teamId: number, saveId: number, result: MatchResult) {
		const starters = await db.players.where("[saveId+teamId]").equals([saveId, teamId]).and((p) => !!p.isStarter).toArray();
		const team = await db.teams.get(teamId);
		let baseFatigue = randomInt(20, 30);
		if (team?.tacticType === "PRESSING") baseFatigue += 10;

		for (const player of starters) {
			const matchRating = result.playerPerformances?.[player.id!.toString()] || 6.0;
			const newRatings = [matchRating, ...(player.lastRatings || [])].slice(0, 5);
			const mStats: PlayerMatchStats | undefined = result.playerStats?.[player.id!.toString()];
			const sStats = player.seasonStats || { matches: 0, goals: 0, assists: 0, avgRating: 0, xg: 0, xa: 0, distance: 0, duelsWinRate: 0, passAccuracy: 0 };
			
			if (mStats) {
				const n = sStats.matches;
				sStats.matches += 1;
				sStats.goals += (mStats.goals || 0);
				sStats.assists += (mStats.assists || 0);
				sStats.xg += (mStats.xg || 0);
				sStats.xa += (mStats.xa || 0);
				sStats.distance += (mStats.distance || 0);
				sStats.avgRating = (sStats.avgRating * n + matchRating) / sStats.matches;
				const mPassAcc = mStats.passes > 0 ? (mStats.passesSuccess || 0) / (mStats.passes || 1) : 0.8;
				sStats.passAccuracy = (sStats.passAccuracy * n + mPassAcc) / sStats.matches;
				const mDuelWin = mStats.duels > 0 ? (mStats.duelsWon || 0) / (mStats.duels || 1) : 0.5;
				sStats.duelsWinRate = (sStats.duelsWinRate * n + mDuelWin) / sStats.matches;
			}

			await db.players.update(player.id!, {
				energy: Math.max(0, (player.energy || 100) - baseFatigue),
				condition: Math.max(10, (player.condition || 100) - randomInt(1, 4)),
				playedThisWeek: true,
				lastRatings: newRatings,
				seasonStats: sStats 
			});
		}
	},

	async processMatchIncidents(result: MatchResult, saveId: number) {
		const events = result.events.filter(e => e.type === "INJURY" || e.type === "CARD");
		for (const event of events) {
			if (!event.playerId) continue;
			const player = await db.players.get(event.playerId);
			if (!player) continue;
			if (event.type === "INJURY") await db.players.update(player.id!, { injuryDays: (player.injuryDays || 0) + (event.duration || 1), isStarter: false });
			else if (event.type === "CARD") await db.players.update(player.id!, { suspensionMatches: (player.suspensionMatches || 0) + (event.duration || 1), isStarter: false });
		}
	},

	async updateTeamStats(teamId: number, goalsFor: number, goalsAgainst: number) {
		const team = await db.teams.get(teamId);
		if (!team) return;
		let pts = team.points || 0;
		if (goalsFor > goalsAgainst) pts += 3; else if (goalsFor === goalsAgainst) pts += 1;
		await db.teams.update(teamId, {
			matchesPlayed: (team.matchesPlayed || 0) + 1,
			points: pts,
			goalsFor: (team.goalsFor || 0) + goalsFor,
			goalsAgainst: (team.goalsAgainst || 0) + goalsAgainst,
			goalDifference: ((team.goalsFor || 0) + goalsFor) - ((team.goalsAgainst || 0) + goalsAgainst),
		});
	},

	async checkSeasonEnd(saveId: number, userLeagueId: number) {
		const totalMatches = await db.matches.where("leagueId").equals(userLeagueId).count();
		const playedMatches = await db.matches.where("leagueId").equals(userLeagueId).and((m) => m.played).count();
		if (totalMatches === 0 || totalMatches !== playedMatches) return false;
		const state = await db.gameState.where("saveId").equals(saveId).first();
		if (!state) return false;
		await db.news.where("saveId").equals(saveId).delete();
		const allLeagues = await db.leagues.where("saveId").equals(saveId).toArray();
		allLeagues.sort((a, b) => a.level - b.level);
		const promotions: Map<number, Team[]> = new Map();
		const relegations: Map<number, Team[]> = new Map();
		for (const league of allLeagues) {
			const teams = await db.teams.where("leagueId").equals(league.id!).toArray();
			teams.sort((a, b) => (b.points || 0) - (a.points || 0) || (b.goalDifference || 0) - (a.goalDifference || 0));
			for (let i = 0; i < teams.length; i++) {
				const t = teams[i];
				await db.history.add({ saveId, teamId: t.id!, seasonYear: state.season, leagueName: league.name, position: i + 1, points: t.points || 0, achievements: i === 0 ? ["Champion"] : [] });
			}
			if (league.id === userLeagueId) {
				const userTeamIndex = teams.findIndex((t) => t.id === state.userTeamId);
				const userPosition = userTeamIndex + 1;
				const userTeam = teams[userTeamIndex];
				let isFailed = false;
				if (userTeam.seasonGoal === "CHAMPION" && userPosition > 1) isFailed = true;
				if (userTeam.seasonGoal === "PROMOTION" && userPosition > league.promotionSpots) isFailed = true;
				if (userTeam.seasonGoal === "MID_TABLE" && userPosition > teams.length / 2) isFailed = true;
				if (isFailed) {
					await db.gameState.where("saveId").equals(saveId).modify({ isGameOver: true });
					await NewsService.addNews(saveId, { day: state.day, date: state.currentDate, title: "LICENCIEMENT", content: `Objectif non rempli pour ${userTeam.name}.`, type: "BOARD", importance: 3 });
					return true;
				}
			}
			const promoteCount = league.promotionSpots;
			const relegateCount = league.relegationSpots;
			if (promoteCount > 0 && league.level > 1) {
				const promotedTeams = teams.slice(0, promoteCount);
				const targetLevel = league.level - 1;
				if (!promotions.has(targetLevel)) promotions.set(targetLevel, []);
				promotions.get(targetLevel)?.push(...promotedTeams);
			}
			if (relegateCount > 0 && league.level < allLeagues.length) {
				const relegatedTeams = teams.slice(teams.length - relegateCount);
				const targetLevel = league.level + 1;
				if (!relegations.has(targetLevel)) relegations.set(targetLevel, []);
				relegations.get(targetLevel)?.push(...relegatedTeams);
			}
		}
		const leaguesByLevel = new Map(allLeagues.map((l) => [l.level, l.id]));
		for (const [level, teams] of promotions) {
			const targetLeagueId = leaguesByLevel.get(level);
			if (targetLeagueId) {
				for (const team of teams) {
					await db.teams.update(team.id!, { leagueId: targetLeagueId });
					if (team.id === state.userTeamId) {
						await NewsService.addNews(saveId, { day: state.day, date: state.currentDate, title: "PROMOTION !", content: "Nous montons dans la division supérieure !", type: "BOARD", importance: 3 });
					}
				}
			}
		}
		for (const [level, teams] of relegations) {
			const targetLeagueId = leaguesByLevel.get(level);
			if (targetLeagueId) {
				for (const team of teams) {
					await db.teams.update(team.id!, { leagueId: targetLeagueId });
					if (team.id === state.userTeamId) {
						await NewsService.addNews(saveId, { day: state.day, date: state.currentDate, title: "RELÉGATION", content: "Une saison cauchemardesque qui nous envoie à l'étage inférieur.", type: "BOARD", importance: 3 });
					}
				}
			}
		}
		await db.matches.where("saveId").equals(saveId).delete();
		for (const league of allLeagues) {
			const currentTeams = await db.teams.where("leagueId").equals(league.id!).toArray();
			const teamIds = currentTeams.map((t) => t.id!);
			for (const t of currentTeams) {
				await db.teams.update(t.id!, { points: 0, matchesPlayed: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0 });
			}
			await generateSeasonFixtures(saveId, league.id!, teamIds);
		}
		return true;
	},
};
