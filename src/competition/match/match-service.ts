import { generateSeasonFixtures } from "@/core/generators/league-templates";
import { type Match, type Player, type Team, type StaffMember, db } from "@/core/db/db";
import { calculateTeamRatings } from "@/core/engine/converter";
import { FORMATIONS } from "@/core/engine/core/tactics";
import type { MatchResult, PlayerMatchStats } from "@/core/engine/core/types";
import { ClubService } from "@/club/club-service";
import { NewsService } from "@/news/service/news-service";
import { randomInt, clamp } from "@/core/utils/math";
import i18next from "i18next";

const simulationWorker = new Worker(
	new URL("../../core/engine/simulation.worker.ts", import.meta.url),
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
				
				await this.autoSelectStarters(saveId, match.homeTeamId, homePlayers);
				await this.autoSelectStarters(saveId, match.awayTeamId, awayPlayers);
				
				const [homeT, awayT, homeCoach, awayCoach] = await Promise.all([
					db.teams.get(match.homeTeamId), db.teams.get(match.awayTeamId),
					db.staff.where("[saveId+teamId]").equals([saveId, match.homeTeamId]).and(s => s.role === "COACH").first(),
					db.staff.where("[saveId+teamId]").equals([saveId, match.awayTeamId]).and(s => s.role === "COACH").first()
				]);

				const homeRatings = calculateTeamRatings(homePlayers, homeT?.tacticType || "NORMAL", homeCoach?.preferredStrategy || "BALANCED", saveId, day, (await db.gameState.where("saveId").equals(saveId).first())?.season || 1, homeCoach?.stats.tactical || 10.0, homeCoach?.preferredStrategy || "BALANCED", match.pressure || 0, homeCoach);
				const awayRatings = calculateTeamRatings(awayPlayers, awayT?.tacticType || "NORMAL", awayCoach?.preferredStrategy || "BALANCED", saveId, day, (await db.gameState.where("saveId").equals(saveId).first())?.season || 1, awayCoach?.stats.tactical || 10.0, awayCoach?.preferredStrategy || "BALANCED", match.pressure || 0, awayCoach);
				
				matchesToSimulate.push({
					matchId: match.id, homeRatings, awayRatings, homeTeamId: match.homeTeamId, awayTeamId: match.awayTeamId,
					homePlayers, awayPlayers, homeName: homeT?.name || "Home", awayName: awayT?.name || "Away",
					homeCoach: homeCoach ? { management: homeCoach.stats.management, tactical: homeCoach.stats.tactical, preferredStrategy: homeCoach.preferredStrategy } : undefined,
					awayCoach: awayCoach ? { management: awayCoach.stats.management, tactical: awayCoach.stats.tactical, preferredStrategy: awayCoach.preferredStrategy } : undefined
				});
			}
			this.runBatchSimulation(matchesToSimulate, saveId, date, userTeamId);
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
			const homeRatings = calculateTeamRatings(homePlayers, homeT?.tacticType || "NORMAL", homeCoach?.preferredStrategy || "BALANCED", saveId, day, (await db.gameState.where("saveId").equals(saveId).first())?.season || 1, homeCoach?.stats.tactical || 10.0, homeCoach?.preferredStrategy || "BALANCED", userMatch.pressure || 0, homeCoach);
			const awayRatings = calculateTeamRatings(awayPlayers, awayT?.tacticType || "NORMAL", awayCoach?.preferredStrategy || "BALANCED", saveId, day, (await db.gameState.where("saveId").equals(saveId).first())?.season || 1, awayCoach?.stats.tactical || 10.0, awayCoach?.preferredStrategy || "BALANCED", userMatch.pressure || 0, awayCoach);
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

	runBatchSimulation(matches: any[], saveId: number, date: Date, userTeamId: number) {
		const language = i18next.language;
		simulationWorker.postMessage({ type: "SIMULATE_BATCH", payload: { matches, saveId, language } });
		const handler = async (e: MessageEvent) => {
			const { type, payload } = e.data;
			if (type === "BATCH_COMPLETE" && payload.saveId === saveId) {
				simulationWorker.removeEventListener("message", handler);
				for (const res of payload.results) {
					const match = await db.matches.get(res.matchId);
					if (match) {
                        const isUserMatch = match.homeTeamId === userTeamId || match.awayTeamId === userTeamId;
                        await this.saveMatchResult(match, res.result, saveId, date, false, isUserMatch);
                    }
				}
			}
		};
		simulationWorker.addEventListener("message", handler);
	},

	async saveMatchResult(match: Match, result: MatchResult, saveId: number, date: Date, generateNews = true, keepDetails = true) {
        const resultToSave = keepDetails ? result : { ...result, events: [] };

		await db.matches.where("id").equals(match.id!).modify({
			homeScore: result.homeScore,
			awayScore: result.awayScore,
			played: true,
			details: JSON.parse(JSON.stringify(resultToSave))
		});

		await Promise.all([
			this.updateTeamStats(match.homeTeamId, result.homeScore, result.awayScore),
			this.updateTeamStats(match.awayTeamId, result.awayScore, result.homeScore),
			this.applyMatchStatsAndFatigue(match.homeTeamId, saveId, result),
			this.applyMatchStatsAndFatigue(match.awayTeamId, saveId, result),
			this.processMatchIncidents(result, saveId),
			ClubService.processSuspensions(saveId, match.homeTeamId),
			ClubService.processSuspensions(saveId, match.awayTeamId),
		]);

		if (generateNews) {
			await NewsService.generateMatchNews(saveId, date, match.homeTeamId, match.awayTeamId, result.homeScore, result.awayScore);
		}
	},

	async applyMatchStatsAndFatigue(teamId: number, saveId: number, result: MatchResult) {
		const players = await db.players.where("[saveId+teamId]").equals([saveId, teamId]).toArray();
		const coach = await db.staff.where("[saveId+teamId]").equals([saveId, teamId]).and(s => s.role === "COACH").first();
        
        // Coach Confidence Logic
        const team = await db.teams.get(teamId);
        if (team && coach) {
            const teamForm = team.lastResults?.length ? team.lastResults.reduce((a, b) => a + b, 0) / team.lastResults.length : 0.5;
			let coachConfidenceChange = (teamForm - 0.5) * 15;
            if (coachConfidenceChange < 0 && coach.traits.includes("MOTIVATOR")) {
                coachConfidenceChange *= 0.5;
            }
			await db.staff.update(coach.id!, {
				confidence: clamp((coach.confidence || 50) + coachConfidenceChange, 0, 100)
			});
        }

		for (const player of players) {
			if (player.isStarter) {
                // Utilise les mises à jour VQN calculées par le moteur, si disponibles
                const playerUpdate = result.playerUpdates?.[player.id!.toString()];
                
				const matchRating = result.playerStats?.[player.id!.toString()]?.rating || 6.0;
				const newRatings = [matchRating, ...(player.lastRatings || [])].slice(0, 5);
				
                const mStats = result.playerStats?.[player.id!.toString()];
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
					
                    // Calcul précis des taux
					const mPassAcc = mStats.passes > 0 ? (mStats.passesSuccess || 0) / (mStats.passes || 1) : 0.8;
					sStats.passAccuracy = (sStats.passAccuracy * n + mPassAcc) / sStats.matches;
					
                    const mDuelWin = mStats.duels > 0 ? (mStats.duelsWon || 0) / (mStats.duels || 1) : 0.5;
					sStats.duelsWinRate = (sStats.duelsWinRate * n + mDuelWin) / sStats.matches;
				}

                // Application des mises à jour VQN
                // Si playerUpdate est fourni par le moteur, on l'utilise
                // Sinon on utilise une formule fallback simplifiée
                let newEnergy = player.energy || 100;
                let newConfidence = player.confidence || 50;
                
                if (playerUpdate) {
                    newEnergy = playerUpdate.energy;
                    newConfidence = playerUpdate.confidence;
                } else {
                    // Fallback (ex: simulation rapide ou vieille version du moteur)
                    newEnergy = Math.max(0, newEnergy - randomInt(20, 30));
                    newConfidence = clamp(newConfidence + (matchRating - 6.0) * 2, 0, 100);
                }

                // Condition (Usure à long terme)
				await db.players.update(player.id!, {
					energy: newEnergy,
					condition: Math.max(10, (player.condition || 100) - randomInt(1, 4)),
					playedThisWeek: true,
					lastRatings: newRatings,
					seasonStats: sStats,
					confidence: newConfidence
				});
			} else {
                // Remplaçants (si pas joué)
                // Légère baisse de confiance si l'équipe perd (non géré ici pour simplifier, on baisse juste de 1)
				await db.players.update(player.id!, {
					confidence: clamp((player.confidence || 50) - 1, 0, 100)
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
			if (event.type === "INJURY") {
				const conditionDrop = randomInt(10, 30);
				await db.players.update(player.id!, { 
					injuryDays: (player.injuryDays || 0) + (event.duration || 1), 
					condition: Math.max(5, (player.condition || 100) - conditionDrop),
					isStarter: false,
					confidence: Math.max(0, (player.confidence || 50) - 10) 
				});
			}
			else if (event.type === "CARD" && (event.duration || 0) > 0) {
				await db.players.update(player.id!, { 
					suspensionMatches: (player.suspensionMatches || 0) + (event.duration || 1), 
					isStarter: false,
					confidence: Math.max(0, (player.confidence || 50) - 5) 
				});
			}
		}
	},

	async updateTeamStats(teamId: number, goalsFor: number, goalsAgainst: number) {
		const team = await db.teams.get(teamId);
		if (!team) return;
		let pts = team.points || 0;
        let wins = team.wins || 0;
        let draws = team.draws || 0;
        let losses = team.losses || 0;
		let resultValue = 0.5; 

		if (goalsFor > goalsAgainst) {
			pts += 3;
            wins += 1;
			resultValue = 1; 
		} else if (goalsFor < goalsAgainst) {
            losses += 1;
			resultValue = 0; 
		} else {
            draws += 1;
        }

		const lastResults = [resultValue, ...(team.lastResults || [])].slice(0, 5);

		await db.teams.update(teamId, {
			matchesPlayed: (team.matchesPlayed || 0) + 1,
			points: pts,
            wins,
            draws,
            losses,
			goalsFor: (team.goalsFor || 0) + goalsFor,
			goalsAgainst: (team.goalsAgainst || 0) + goalsAgainst,
			goalDifference: ((team.goalsFor || 0) + goalsFor) - ((team.goalsAgainst || 0) + goalsAgainst),
			lastResults
		});
	},

	async checkSeasonEnd(saveId: number, userLeagueId: number) {
		const totalMatches = await db.matches.where("leagueId").equals(userLeagueId).count();
		const playedMatches = await db.matches.where("leagueId").equals(userLeagueId).and((m) => m.played).count();
		if (totalMatches === 0 || totalMatches !== playedMatches) return false;
		const state = await db.gameState.where("saveId").equals(saveId).first();
		if (!state) return false;

		const allLeagues = await db.leagues.where("saveId").equals(saveId).toArray();
		allLeagues.sort((a, b) => a.level - b.level);
		
		const promotions: Map<number, Team[]> = new Map();
		const relegations: Map<number, Team[]> = new Map();

		for (const league of allLeagues) {
			const teams = await db.teams.where("leagueId").equals(league.id!).toArray();
			teams.sort((a, b) => (b.points || 0) - (a.points || 0) || (b.goalDifference || 0) - (a.goalDifference || 0));
			
			for (let i = 0; i < teams.length; i++) {
				const t = teams[i];
				
				const players = await db.players.where("[saveId+teamId]").equals([saveId, t.id!]).toArray();
				let topScorer = players[0];
				for (const p of players) {
					if ((p.seasonStats?.goals || 0) > (topScorer?.seasonStats?.goals || 0)) {
						topScorer = p;
					}
				}

				await db.history.add({ 
					saveId, 
					teamId: t.id!, 
					seasonYear: state.season, 
					leagueName: league.name, 
					position: i + 1, 
					points: t.points || 0, 
					goalsFor: t.goalsFor || 0,
					goalsAgainst: t.goalsAgainst || 0,
					budget: t.budget || 0,
					topScorerName: topScorer ? `${topScorer.firstName} ${topScorer.lastName}` : "N/A",
					topScorerGoals: topScorer?.seasonStats?.goals || 0,
					achievements: i === 0 ? ["Champion"] : [] 
				});
				
				for (const p of players) {
					await db.players.update(p.id!, {
						seasonStats: { matches: 0, goals: 0, assists: 0, avgRating: 0, xg: 0, xa: 0, distance: 0, duelsWinRate: 0, passAccuracy: 0 }
					});
				}
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

		await db.news.where("saveId").equals(saveId).delete();
		await db.matches.where("saveId").equals(saveId).delete();

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

		for (const [level, teamsToRelegate] of relegations) {
			const targetLeagueId = leaguesByLevel.get(level);
			if (targetLeagueId) {
				for (const team of teamsToRelegate) {
					await db.teams.update(team.id!, { leagueId: targetLeagueId });
					if (team.id === state.userTeamId) {
						await NewsService.addNews(saveId, { day: state.day, date: state.currentDate, title: "RELÉGATION", content: "Une saison cauchemardesque qui nous envoie à l'étage inférieur.", type: "BOARD", importance: 3 });
					}
				}
			}
		}

		for (const league of allLeagues) {
			const currentTeams = await db.teams.where("leagueId").equals(league.id!).toArray();
			const teamIds = currentTeams.map((t) => t.id!);
			for (const t of currentTeams) {
				await db.teams.update(t.id!, { points: 0, matchesPlayed: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, wins: 0, draws: 0, losses: 0 });
			}
			await generateSeasonFixtures(saveId, league.id!, teamIds);
		}
		return true;
	},
};
