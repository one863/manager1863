import { getNarrative } from "@/data/narratives";
import { type NewsArticle, db } from "@/db/db";
import { getRandomElement, probability } from "@/utils/math";

export const NewsService = {
	async addNews(saveId: number, article: Omit<NewsArticle, "id" | "saveId" | "isRead">) {
		const newsItem: NewsArticle = { ...article, saveId, isRead: false };
		return await db.news.add(newsItem);
	},

	async getLatestNews(saveId: number, limit = 5) {
		const gameState = await db.gameState.where("saveId").equals(saveId).first();
		if (!gameState) return [];
		const allNews = await db.news.where("saveId").equals(saveId).toArray();
		const visibleNews = allNews.filter((n) => n.day <= gameState.day);
		visibleNews.sort((a, b) => {
			if (b.day !== a.day) return b.day - a.day;
			return (b.id || 0) - (a.id || 0);
		});
		return visibleNews.slice(0, limit);
	},

	async getAllNews(saveId: number) {
		const gameState = await db.gameState.where("saveId").equals(saveId).first();
		if (!gameState) return [];
		const allNews = await db.news.where("saveId").equals(saveId).toArray();
		const visibleNews = allNews.filter((n) => n.day <= gameState.day);
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
		if (day % 7 === 0 && day > 0) await this.generateSundayBoardReport(saveId, date, teamId, day);
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
			score: `${homeScore}-${awayScore}`, // Always show Home-Away in text
			stadium: homeT.stadiumName || "le stade",
		});

		await this.addNews(saveId, {
			day: state?.day || 0,
			date,
			title: narrative.title || "Résultat du match",
			content: narrative.content,
			type: "PRESS",
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
		const narrative = getNarrative("board", "sundayReport", { position: pos, budget: team.budget, confidence: team.confidence, team: team.name, goal: team.seasonGoal || "Non défini" });
		await this.addNews(saveId, { day: forcedDay || state?.day || 0, date, title: narrative.title || "Bilan du Conseil d'Administration", content: narrative.content, type: "BOARD", importance: 2 });
	},
};
