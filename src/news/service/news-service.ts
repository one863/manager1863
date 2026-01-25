import { getNarrative } from "@/core/generators/narratives";
import { type NewsArticle, db } from "@/core/db/db";
import { getRandomElement, probability, clamp } from "@/core/utils/math";
import { CreateNewsArticleSchema } from "@/core/domain";
import { validateOrThrow } from "@/core/validation/zod-utils";

export const NewsService = {
	async addNews(saveId: number, article: Omit<NewsArticle, "id" | "saveId" | "isRead">) {
		// Log de debug pour traquer la catégorie brute
		console.warn('[NewsService.addNews] Catégorie brute reçue :', article.category);
		// Correction automatique de la catégorie
		const allowed = ["MATCH", "TRANSFER", "CLUB", "LEAGUE"];
		let category = article.category;
		if (typeof category === "string") {
			category = category.toUpperCase();
			if (!allowed.includes(category)) {
				category = "CLUB"; // fallback par défaut
			}
		} else {
			// Si la catégorie n'est pas une string, fallback direct
			category = "CLUB";
		}
		// Injecte isRead: false AVANT la validation Zod
		const validatedArticle = validateOrThrow(
			CreateNewsArticleSchema,
			{ ...article, category: String(category), saveId, isRead: false },
			"NewsService.addNews",
		);
		return await db.news.add(validatedArticle);
	},

	async getLatestNews(saveId: number, limit = 5, currentDay?: number) {
		let day = currentDay;
		if (day === undefined) {
			const gameState = await db.gameState.where("saveId").equals(saveId).first();
			day = gameState?.day || 1;
		}
		const allNews = await db.news.where("saveId").equals(saveId).toArray();
		const visibleNews = allNews.filter((n) => n.day <= day!);
		visibleNews.sort((a, b) => {
			if (b.day !== a.day) return b.day - a.day;
			return (b.id || 0) - (a.id || 0);
		});
		return visibleNews.slice(0, limit);
	},

	async getAllNews(saveId: number, currentDay?: number) {
		let day = currentDay;
		if (day === undefined) {
			const gameState = await db.gameState.where("saveId").equals(saveId).first();
			day = gameState?.day || 1;
		}
		const allNews = await db.news.where("saveId").equals(saveId).toArray();
		const visibleNews = allNews.filter((n) => n.day <= day!);
		visibleNews.sort((a, b) => {
			if (b.day !== a.day) return b.day - a.day;
			return (b.id || 0) - (a.id || 0);
		});
		return visibleNews;
	},

	async markAsRead(newsId: number) {
		return await db.news.update(newsId, { isRead: true });
	},

	async cleanupOldNews(saveId: number, _currentSeason: number) {
		const count = await db.news.where("saveId").equals(saveId).count();
		const MAX_NEWS = 200;
		if (count > MAX_NEWS) {
			const deleteCount = count - MAX_NEWS;
			const oldestNews = await db.news.where("saveId").equals(saveId).limit(deleteCount).primaryKeys();
			await db.news.bulkDelete(oldestNews);
		}
	},

	async processDailyNews(saveId: number, day: number, date: Date, teamId: number) {
		// Rapport du dimanche (Finances / Direction)
		if (day % 7 === 0 && day > 0) await this.generateSundayBoardReport(saveId, date, teamId, day);
		
		// Rapport d'entraînement du mercredi (Impact : boost sur un joueur)
		if (day % 7 === 3) await this.generateWednesdayTrainingReport(saveId, date, teamId, day);

		// News de jour de match (Impact : petit boost de moral d'équipe)
		await this.generateMatchDayNews(saveId, day, date, teamId);

		// Événements aléatoires hebdomadaires (Impact : Argent, Forme, Réputation)
		if (day % 7 === 5 && probability(0.4)) await this.generateRandomEvent(saveId, day, date, teamId);
	},

	async generateMatchDayNews(saveId: number, day: number, date: Date, teamId: number) {
		const match = await db.matches.where("[saveId+day]").equals([saveId, day])
			.and(m => m.homeTeamId === teamId || m.awayTeamId === teamId).first();
		
		if (match) {
			const isHome = match.homeTeamId === teamId;
			const oppId = isHome ? match.awayTeamId : match.homeTeamId;
			const [team, opp] = await Promise.all([db.teams.get(teamId), db.teams.get(oppId)]);
			
			if (team && opp) {
				const narrative = getNarrative("news", "matchDay", {
					team: `[[team:${teamId}|${team.name}]]`,
					opponent: `[[team:${oppId}|${opp.name}]]`,
					stadium: team.stadiumName || "le stade"
				});

                // IMPACT : Boost de moral léger pour toute l'équipe (+2%)
                const players = await db.players.where("[saveId+teamId]").equals([saveId, teamId]).toArray();
                for (const p of players) {
                    await db.players.update(p.id!, { morale: clamp(p.morale + 2, 0, 100) });
                }

				   await this.addNews(saveId, {
					   day, date,
					   title: narrative.title || "Jour de Match",
					   content: narrative.content + "\n\n[[badge:positive|+2% Moral d'équipe]]",
					   category: "MATCH",
					   importance: 2
				   });
			}
		}
	},

	async generateWednesdayTrainingReport(saveId: number, date: Date, teamId: number, day: number) {
		const players = await db.players.where("[saveId+teamId]").equals([saveId, teamId]).toArray();
		if (players.length === 0) return;
		const bestPlayer = players.sort((a, b) => b.skill - a.skill)[0];

		const narrative = getNarrative("training", "wednesdayReport", {
			player: `[[player:${bestPlayer.id}|${bestPlayer.firstName} ${bestPlayer.lastName}]]`
		});

        // IMPACT : Le joueur vedette gagne en forme et en moral
        await db.players.update(bestPlayer.id!, {
            form: clamp(bestPlayer.form + 0.5, 1, 10),
            morale: clamp(bestPlayer.morale + 10, 0, 100)
        });

		   await this.addNews(saveId, {
			   day, date,
			   title: narrative.title || "Point Entraînement",
			   content: narrative.content + `\n\n[[badge:positive|+0.5 Forme]] [[badge:positive|+10 Moral]] pour **${bestPlayer.lastName}**`,
			   category: "CLUB",
			   importance: 1
		   });
	},

	async generateRandomEvent(saveId: number, day: number, date: Date, teamId: number) {
		const team = await db.teams.get(teamId);
		if (!team) return;

		const isPositive = probability(0.6);
        const players = await db.players.where("[saveId+teamId]").equals([saveId, teamId]).toArray();
        
        let title = "";
        let content = "";
        let importance = 2;

        if (isPositive) {
            const roll = Math.random();
            if (roll < 0.33) {
                // Investisseur
                title = "Investisseur Mystère";
                content = "Un mécène local a fait un don pour soutenir le projet du club. Le budget grimpe !";
                await db.teams.update(teamId, { budget: team.budget + 100 });
                content += "\n\n[[badge:budget|+M 100 Budget]]";
            } else if (roll < 0.66) {
                // TikTok
                title = "Buzz sur les Réseaux";
                content = "Une vidéo des coulisses du club est devenue virale. La réputation du club explose !";
                await db.teams.update(teamId, { reputation: clamp(team.reputation + 5, 0, 100) });
                content += "\n\n[[badge:positive|+5% Réputation]]";
            } else {
                // Centre d'entrainement
                title = "Ambiance au Top";
                content = "Le groupe vit extrêmement bien. Les joueurs sont ravis de l'ambiance au club.";
                for (const p of players) {
                    await db.players.update(p.id!, { morale: clamp(p.morale + 15, 0, 100) });
                }
                content += "\n\n[[badge:positive|+15% Moral d'équipe]]";
            }
        } else {
            const roll = Math.random();
            if (roll < 0.33) {
                // Virus
                title = "Épidémie de Grippe";
                content = "Un virus circule dans les vestiaires. L'équipe est affaiblie physiquement.";
                for (const p of players) {
                    await db.players.update(p.id!, { energy: clamp(p.energy - 20, 0, 100) });
                }
                content += "\n\n[[badge:negative|-20% Énergie d'équipe]]";
                importance = 3;
            } else if (roll < 0.66) {
                // Matériel
                title = "Incident Technique";
                content = "La chaudière du stade a lâché. Les réparations imprévues pèsent sur les finances.";
                await db.teams.update(teamId, { budget: Math.max(0, team.budget - 50) });
                content += "\n\n[[badge:budget|-M 50 Budget]]";
            } else {
                // Bad Buzz
                title = "Crise de Communication";
                content = "Une polémique médiatique touche le club. Le Conseil d'Administration n'apprécie pas du tout.";
                await db.teams.update(teamId, { confidence: clamp(team.confidence - 10, 0, 100) });
                content += "\n\n[[badge:negative|-10% Confiance du Board]]";
                importance = 3;
            }
        }

		   await this.addNews(saveId, {
			   day, date,
			   title,
			   content,
			   category: "CLUB",
			   importance
		   });
	},

	async generateMatchNews(saveId: number, date: Date, homeTeamId: number, awayTeamId: number, homeScore: number, awayScore: number) {
		const state = await db.gameState.where("saveId").equals(saveId).first();
		const userTeamId = state?.userTeamId;
		if (!userTeamId) return;

		const isHome = homeTeamId === userTeamId;
		const myScore = isHome ? homeScore : awayScore;
		const oppScore = isHome ? awayScore : homeScore;
		
		const isWin = myScore > oppScore;
		const isDraw = myScore === oppScore;
		const type = isWin ? "victory" : isDraw ? "draw" : "loss";

		const [homeT, awayT] = await Promise.all([db.teams.get(homeTeamId), db.teams.get(awayTeamId)]);
		if (!homeT || !awayT) return;

		const teamName = isHome ? homeT.name : awayT.name;
		const opponentName = isHome ? awayT.name : homeT.name;

		const teamLink = `[[team:${userTeamId}|${teamName}]]`;
		const opponentLink = `[[team:${isHome ? awayTeamId : homeTeamId}|${opponentName}]]`;

		const narrative = getNarrative("news", type, {
			team: teamLink,
			opponent: opponentLink,
			score: `${homeScore}-${awayScore}`,
			stadium: homeT.stadiumName || "le stade",
		});

		   await this.addNews(saveId, {
			   day: state?.day || 0,
			   date,
			   title: narrative.title || "Résultat du match",
			   content: narrative.content,
			   category: "MATCH",
			   importance: isWin ? 2 : 1,
		   });
	},

	async generateSundayBoardReport(saveId: number, date: Date, teamId: number, forcedDay?: number) {
		const team = await db.teams.get(teamId);
		if (!team) return;
		const teams = await db.teams.where("leagueId").equals(team.leagueId).toArray();
		teams.sort((a, b) => (b.points || 0) - (a.points || 0));
		const pos = teams.findIndex((t) => t.id === teamId) + 1;
		const state = await db.gameState.where("saveId").equals(saveId).first();
		const narrative = getNarrative("board", "sundayReport", { position: pos, budget: team.budget, confidence: team.confidence, team: `[[team:${teamId}|${team.name}]]`, goal: team.seasonGoal || "Non défini" });
		await this.addNews(saveId, { day: forcedDay || state?.day || 0, date, title: narrative.title || "Bilan du Conseil d'Administration", content: narrative.content + `\n\n[[badge:budget|M ${team.budget} Budget]] [[badge:positive|${team.confidence}% Confiance]]`, category: "CLUB", importance: 2 });
	},
};
