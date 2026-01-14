import { generateSeasonFixtures } from "@/data/league-templates";
import { type Match, type Player, type Team, db } from "@/db/db";
import { calculateTeamRatings } from "@/engine/converter";
import { FORMATIONS } from "@/engine/tactics";
import type { MatchResult } from "@/engine/types";
import { ClubService } from "@/services/club-service";
import { NewsService } from "@/services/news-service";
import { randomInt } from "@/utils/math";
import i18next from "i18next";

const simulationWorker = new Worker(
	new URL("../engine/simulation.worker.ts", import.meta.url),
	{ type: "module" },
);

// Helper function to simulate a single match in the worker
const runMatchInWorker = (
	matchData: any,
	language: string,
): Promise<MatchResult> => {
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
		simulationWorker.postMessage({
			type: "SIMULATE_MATCH",
			payload: { ...matchData, requestId, language },
		});
	});
};

export const MatchService = {
	async hasUserMatchToday(
		saveId: number,
		day: number,
		userTeamId: number,
	): Promise<boolean> {
		const match = await db.matches
			.where("[saveId+day]")
			.equals([saveId, day])
			.and(
				(m) =>
					(m.homeTeamId === userTeamId || m.awayTeamId === userTeamId) &&
					!m.played,
			)
			.first();

		return !!match;
	},

	async autoSelectStarters(
		saveId: number,
		teamId: number,
		currentPlayers: Player[],
	) {
		// 1. Check if we need to fill gaps
		const currentStarters = currentPlayers.filter((p) => p.isStarter);
		if (currentStarters.length >= 11) return;

		// 2. Fetch Context (Coach & Formation)
		const [coach, team] = await Promise.all([
			db.staff
				.where("[saveId+teamId]")
				.equals([saveId, teamId])
				.and((s) => s.role === "COACH")
				.first(),
			db.teams.get(teamId),
		]);

		const coachSkill = coach ? coach.skill : 50; // Default average if no coach
		const formationKey = team?.formation || "4-4-2";
		const req =
			(FORMATIONS as any)[formationKey] || (FORMATIONS as any)["4-4-2"];

		// 3. Prepare pools
		const counts = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
		currentStarters.forEach((p) => {
			if (counts[p.position] !== undefined) counts[p.position]++;
		});

		const needed = {
			GK: Math.max(0, (req.GK || 0) - counts.GK),
			DEF: Math.max(0, (req.DEF || 0) - counts.DEF),
			MID: Math.max(0, (req.MID || 0) - counts.MID),
			FWD: Math.max(0, (req.FWD || 0) - counts.FWD),
		};

		let available = currentPlayers.filter((p) => !p.isStarter);
		const newStartersIds: number[] = [];

		const pickForPos = (pos: "GK" | "DEF" | "MID" | "FWD", count: number) => {
			let candidates = available
				.filter((p) => p.position === pos)
				.sort((a, b) => b.skill - a.skill);
			// Fallback: if not enough candidates of correct position, take anyone sorted by skill
			if (candidates.length < count) {
				const others = available
					.filter((p) => p.position !== pos)
					.sort((a, b) => b.skill - a.skill);
				candidates = [...candidates, ...others];
			}

			for (let i = 0; i < count; i++) {
				if (candidates.length === 0) break;

				// Coach Logic: Pick based on skill/competence
				const errorMargin = Math.max(0.05, 1 - coachSkill / 100);
				const maxIndex = Math.min(
					candidates.length - 1,
					Math.floor(candidates.length * errorMargin),
				);
				const pickIndex = randomInt(0, maxIndex);

				const picked = candidates[pickIndex];
				newStartersIds.push(picked.id!);

				// Remove from available and candidates
				available = available.filter((p) => p.id !== picked.id);
				candidates.splice(pickIndex, 1);
			}
		};

		pickForPos("GK", needed.GK);
		pickForPos("DEF", needed.DEF);
		pickForPos("MID", needed.MID);
		pickForPos("FWD", needed.FWD);

		// If still < 11, fill with whatever remains
		while (
			newStartersIds.length + currentStarters.length < 11 &&
			available.length > 0
		) {
			const p = available[0];
			newStartersIds.push(p.id!);
			available.shift();
		}

		// Update DB and currentPlayers array in place
		if (newStartersIds.length > 0) {
			await db.players
				.where("id")
				.anyOf(newStartersIds)
				.modify({ isStarter: true });
			currentPlayers.forEach((p) => {
				if (newStartersIds.includes(p.id!)) p.isStarter = true;
			});
		}
	},

	async simulateDayByDay(
		saveId: number,
		day: number,
		userTeamId: number,
		date: Date,
	): Promise<any> {
		const todaysMatches = await db.matches
			.where("[saveId+day]")
			.equals([saveId, day])
			.toArray();

		const userMatch = todaysMatches.find(
			(m) =>
				(m.homeTeamId === userTeamId || m.awayTeamId === userTeamId) &&
				!m.played,
		);
		if (userMatch) {
			const [homeTeam, awayTeam] = await Promise.all([
				db.teams.get(userMatch.homeTeamId),
				db.teams.get(userMatch.awayTeamId),
			]);
			if (homeTeam && awayTeam) {
				await NewsService.announceMatchDay(
					saveId,
					date,
					homeTeam.name,
					awayTeam.name,
					homeTeam.stadiumName,
				);
			}
		}

		const otherMatches = todaysMatches.filter(
			(m) =>
				!m.played && m.homeTeamId !== userTeamId && m.awayTeamId !== userTeamId,
		);

		if (otherMatches.length > 0) {
			const allPlayers = await db.players
				.where("saveId")
				.equals(saveId)
				.toArray();
			const playersByTeam = allPlayers.reduce(
				(acc, player) => {
					if (!acc[player.teamId]) acc[player.teamId] = [];
					acc[player.teamId].push(player);
					return acc;
				},
				{} as Record<number, Player[]>,
			);

			const matchesToSimulate = [];
			for (const match of otherMatches) {
				const homePlayers = playersByTeam[match.homeTeamId] || [];
				const awayPlayers = playersByTeam[match.awayTeamId] || [];
				const [homeT, awayT] = await Promise.all([
					db.teams.get(match.homeTeamId),
					db.teams.get(match.awayTeamId),
				]);

				matchesToSimulate.push({
					matchId: match.id,
					homeRatings: calculateTeamRatings(
						homePlayers,
						homeT?.tacticType || "NORMAL",
					),
					awayRatings: calculateTeamRatings(
						awayPlayers,
						awayT?.tacticType || "NORMAL",
					),
					homeTeamId: match.homeTeamId,
					awayTeamId: match.awayTeamId,
					homePlayers,
					awayPlayers,
					homeName: homeT?.name || "Home",
					awayName: awayT?.name || "Away",
				});
			}
			this.runBatchSimulation(matchesToSimulate, saveId, date);
		}

		if (userMatch) {
			const homePlayers = await db.players
				.where("[saveId+teamId]")
				.equals([saveId, userMatch.homeTeamId])
				.toArray();
			const awayPlayers = await db.players
				.where("[saveId+teamId]")
				.equals([saveId, userMatch.awayTeamId])
				.toArray();

			// AUTO-SELECT for User Team (Coach Logic)
			if (userMatch.homeTeamId === userTeamId) {
				await this.autoSelectStarters(saveId, userTeamId, homePlayers);
			} else if (userMatch.awayTeamId === userTeamId) {
				await this.autoSelectStarters(saveId, userTeamId, awayPlayers);
			}

			const [homeT, awayT] = await Promise.all([
				db.teams.get(userMatch.homeTeamId),
				db.teams.get(userMatch.awayTeamId),
			]);

			const matchData = {
				homeRatings: calculateTeamRatings(
					homePlayers,
					homeT?.tacticType || "NORMAL",
				),
				awayRatings: calculateTeamRatings(
					awayPlayers,
					awayT?.tacticType || "NORMAL",
				),
				homeTeamId: userMatch.homeTeamId,
				awayTeamId: userMatch.awayTeamId,
				homePlayers,
				awayPlayers,
				homeName: homeT?.name || "Home",
				awayName: awayT?.name || "Away",
			};

			const result = await runMatchInWorker(matchData, i18next.language);

			return {
				matchId: userMatch.id!,
				homeTeam: homeT,
				awayTeam: awayT,
				result,
			};
		}

		return null;
	},

	runBatchSimulation(matches: any[], saveId: number, date: Date) {
		const language = i18next.language;
		simulationWorker.postMessage({
			type: "SIMULATE_BATCH",
			payload: { matches, saveId, language },
		});

		const handler = async (e: MessageEvent) => {
			const { type, payload } = e.data;
			if (type === "BATCH_COMPLETE" && payload.saveId === saveId) {
				simulationWorker.removeEventListener("message", handler);
				await db.transaction(
					"rw",
					[db.matches, db.teams, db.gameState, db.news, db.players],
					async () => {
						for (const res of payload.results) {
							const match = await db.matches.get(res.matchId);
							if (match)
								await this.saveMatchResult(
									match,
									res.result,
									saveId,
									date,
									false,
								);
						}
					},
				);
			}
		};

		simulationWorker.addEventListener("message", handler);
	},

	async saveMatchResult(
		match: Match,
		result: MatchResult,
		saveId: number,
		date: Date,
		generateNews = true,
	) {
		await db.matches.update(match.id!, {
			homeScore: result.homeScore,
			awayScore: result.awayScore,
			played: true,
			details: result,
		});

		await Promise.all([
			this.updateTeamStats(
				match.homeTeamId,
				result.homeScore,
				result.awayScore,
			),
			this.updateTeamStats(
				match.awayTeamId,
				result.awayScore,
				result.homeScore,
			),
			this.applyMatchFatigue(match.homeTeamId, saveId),
			this.applyMatchFatigue(match.awayTeamId, saveId),
		]);

		if (generateNews) {
			const [homeT, awayT] = await Promise.all([
				db.teams.get(match.homeTeamId),
				db.teams.get(match.awayTeamId),
			]);
			if (homeT && awayT) {
				await NewsService.generateMatchNews(
					saveId,
					date,
					homeT.name,
					awayT.name,
					result.homeScore,
					result.awayScore,
				);
			}
		}

		const state = await db.gameState.get(saveId);
		if (
			state &&
			(match.homeTeamId === state.userTeamId ||
				match.awayTeamId === state.userTeamId)
		) {
			const isHome = match.homeTeamId === state.userTeamId;
			await ClubService.updateDynamicsAfterMatch(
				state.userTeamId!,
				isHome ? result.homeScore : result.awayScore,
				isHome ? result.awayScore : result.homeScore,
				isHome,
				saveId,
				date,
			);
		}
	},

	async applyMatchFatigue(teamId: number, saveId: number) {
		const team = await db.teams.get(teamId);
		const starters = await db.players
			.where("[saveId+teamId]")
			.equals([saveId, teamId])
			.and((p) => !!p.isStarter)
			.toArray();

		let baseFatigue = randomInt(20, 30);
		if (team?.tacticType === "PRESSING") baseFatigue += 10;

		for (const player of starters) {
			const currentEnergy = player.energy || 100;
			const currentCondition = player.condition || 100;

			const newEnergy = Math.max(0, currentEnergy - baseFatigue);

			const condLoss = randomInt(1, 4);
			const newCondition = Math.max(10, currentCondition - condLoss);

			await db.players.update(player.id!, {
				energy: newEnergy,
				condition: newCondition,
			});
		}
	},

	async updateTeamStats(
		teamId: number,
		goalsFor: number,
		goalsAgainst: number,
	) {
		const team = await db.teams.get(teamId);
		if (!team) return;
		let pts = team.points || 0;
		if (goalsFor > goalsAgainst) pts += 3;
		else if (goalsFor === goalsAgainst) pts += 1;

		const newGF = (team.goalsFor || 0) + goalsFor;
		const newGA = (team.goalsAgainst || 0) + goalsAgainst;
		const newGD = newGF - newGA;

		await db.teams.update(teamId, {
			matchesPlayed: (team.matchesPlayed || 0) + 1,
			points: pts,
			goalsFor: newGF,
			goalsAgainst: newGA,
			goalDifference: newGD,
		});
	},

	async checkSeasonEnd(saveId: number, userLeagueId: number) {
		const totalMatches = await db.matches
			.where("leagueId")
			.equals(userLeagueId)
			.count();
		const playedMatches = await db.matches
			.where("leagueId")
			.equals(userLeagueId)
			.and((m) => m.played)
			.count();
		if (totalMatches === 0 || totalMatches !== playedMatches) return false;

		const state = await db.gameState.get(saveId);
		if (!state) return false;

		await db.news.where("saveId").equals(saveId).delete();

		const allLeagues = await db.leagues
			.where("saveId")
			.equals(saveId)
			.toArray();
		allLeagues.sort((a, b) => a.level - b.level);

		const promotions: Map<number, Team[]> = new Map();
		const relegations: Map<number, Team[]> = new Map();

		for (const league of allLeagues) {
			const teams = await db.teams
				.where("leagueId")
				.equals(league.id!)
				.toArray();
			const hasMatches =
				(await db.matches.where("leagueId").equals(league.id!).count()) > 0;

			if (hasMatches) {
				teams.sort(
					(a, b) =>
						(b.points || 0) - (a.points || 0) ||
						(b.goalDifference || 0) - (a.goalDifference || 0),
				);
			} else {
				teams.sort(
					(a, b) =>
						b.reputation +
						randomInt(-10, 10) -
						(a.reputation + randomInt(-10, 10)),
				);
			}

			for (let i = 0; i < teams.length; i++) {
				const t = teams[i];
				await db.history.add({
					saveId,
					teamId: t.id!,
					seasonYear: state.season,
					leagueName: league.name,
					position: i + 1,
					points: t.points || 0,
					achievements: i === 0 ? ["Champion"] : [],
				});
			}

			if (league.id === userLeagueId) {
				const userTeamIndex = teams.findIndex((t) => t.id === state.userTeamId);
				const userPosition = userTeamIndex + 1;
				const userTeam = teams[userTeamIndex];

				let isFailed = false;
				if (userTeam.seasonGoal === "CHAMPION" && userPosition > 1)
					isFailed = true;
				if (
					userTeam.seasonGoal === "PROMOTION" &&
					userPosition > league.promotionSpots
				)
					isFailed = true;
				if (
					userTeam.seasonGoal === "MID_TABLE" &&
					userPosition > teams.length / 2
				)
					isFailed = true;

				if (isFailed) {
					await db.gameState.update(saveId, { isGameOver: true });
					await NewsService.addNews(saveId, {
						day: state.day,
						date: state.currentDate,
						title: "LICENCIEMENT",
						content: `Objectif non rempli pour ${userTeam.name}.`,
						type: "BOARD",
						importance: 3,
					});
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
						await NewsService.addNews(saveId, {
							day: state.day,
							date: state.currentDate,
							title: "PROMOTION !",
							content: "Nous montons dans la division supérieure !",
							type: "BOARD",
							importance: 3,
						});
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
						await NewsService.addNews(saveId, {
							day: state.day,
							date: state.currentDate,
							title: "RELÉGATION",
							content:
								"Une saison cauchemardesque qui nous envoie à l'étage inférieur.",
							type: "BOARD",
							importance: 3,
						});
					}
				}
			}
		}

		await db.matches.where("saveId").equals(saveId).delete();

		for (const league of allLeagues) {
			const currentTeams = await db.teams
				.where("leagueId")
				.equals(league.id!)
				.toArray();
			const teamIds = currentTeams.map((t) => t.id!);

			for (const t of currentTeams) {
				await db.teams.update(t.id!, {
					points: 0,
					matchesPlayed: 0,
					goalsFor: 0,
					goalsAgainst: 0,
					goalDifference: 0,
				});
			}

			await generateSeasonFixtures(saveId, league.id!, teamIds);
		}

		return true;
	},
};
