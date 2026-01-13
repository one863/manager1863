import { db, NewsArticle, Player } from '@/db/db';
import { getNarrative } from '@/data/narratives';
import { probability, getRandomElement } from '@/utils/math';

export const NewsService = {
  async addNews(saveId: number, article: Omit<NewsArticle, 'id' | 'saveId' | 'isRead'>) {
    return await db.news.add({ ...article, saveId, isRead: false });
  },

  async getLatestNews(saveId: number, limit: number = 5) {
    return await db.news.where('saveId').equals(saveId).reverse().limit(limit).toArray();
  },

  async getAllNews(saveId: number) {
    return await db.news.where('saveId').equals(saveId).reverse().toArray();
  },

  async markAsRead(newsId: number) {
    return await db.news.update(newsId, { isRead: true });
  },

  async cleanupOldNews(saveId: number, currentSeason: number) {
    // Keep news only for current and previous season
    const keepFromSeason = currentSeason - 1;
    // We need to fetch news and filter because we don't store season in news directly
    // Or simpler: delete news older than X days if we had a date index, but day index is per save
    // However, news has a 'day' field. Assuming a season is ~40-50 weeks * 7 days.
    // Let's approximate: 1 season ~ 300 days (to be safe).
    // Better strategy: Count total news, if > 200, delete oldest ones.
    
    const count = await db.news.where('saveId').equals(saveId).count();
    const MAX_NEWS = 200;
    
    if (count > MAX_NEWS) {
      const deleteCount = count - MAX_NEWS;
      // Get IDs of oldest news
      const oldestNews = await db.news.where('saveId').equals(saveId).limit(deleteCount).primaryKeys();
      await db.news.bulkDelete(oldestNews);
    }
  },

  async generateMatchNews(saveId: number, date: Date, teamName: string, opponentName: string, myScore: number, oppScore: number) {
    const isWin = myScore > oppScore;
    const isDraw = myScore === oppScore;
    const type = isWin ? 'victory' : isDraw ? 'draw' : 'loss';
    const userTeam = await db.teams.where('saveId').equals(saveId).and(t => t.name === teamName).first();
    const state = await db.gameState.get(saveId);
    
    const narrative = getNarrative('news', type, { team: teamName, opponent: opponentName, score: `${myScore}-${oppScore}`, stadium: userTeam?.stadiumName || "le stade" });
    await this.addNews(saveId, { 
      day: state?.day || 0,
      date, 
      title: narrative.title || "Résultat du match", 
      content: narrative.content, 
      type: 'PRESS', 
      importance: isWin ? 2 : 1 
    });
  },

  async announceMatchDay(saveId: number, date: Date, teamName: string, opponentName: string, stadiumName: string) {
    const narrative = getNarrative('news', 'matchDay', { team: teamName, opponent: opponentName, stadium: stadiumName });
    const state = await db.gameState.get(saveId);
    await this.addNews(saveId, { 
      day: state?.day || 0,
      date, 
      title: narrative.title || "JOUR DE MATCH", 
      content: narrative.content, 
      type: 'PRESS', 
      importance: 2 
    });
  },

  async generateTrainingReport(saveId: number, date: Date, teamId: number) {
    const players = await db.players.where('[saveId+teamId]').equals([saveId, teamId]).toArray();
    const topPlayer = getRandomElement(players);
    const narrative = getNarrative('training', 'wednesdayReport', { player: topPlayer ? topPlayer.lastName : "L'effectif" });
    const state = await db.gameState.get(saveId);

    await this.addNews(saveId, { 
      day: state?.day || 0,
      date, 
      title: narrative.title || "Rapport d'entraînement", 
      content: narrative.content, 
      type: 'CLUB', 
      importance: 1 
    });
  },

  async generateSundayBoardReport(saveId: number, date: Date, teamId: number) {
    const team = await db.teams.get(teamId);
    if (!team) return;

    const teams = await db.teams.where('leagueId').equals(team.leagueId).toArray();
    teams.sort((a, b) => (b.points || 0) - (a.points || 0));
    const pos = teams.findIndex(t => t.id === teamId) + 1;
    const state = await db.gameState.get(saveId);

    const narrative = getNarrative('board', 'sundayReport', {
      position: pos,
      budget: team.budget,
      confidence: team.confidence,
      team: team.name,
      goal: team.seasonGoal || "Non défini"
    });

    await this.addNews(saveId, { 
      day: state?.day || 0,
      date, 
      title: narrative.title || "Bilan de la Direction", 
      content: narrative.content, 
      type: 'BOARD', 
      importance: 2 
    });
  },

  async generateWeeklyEvents(saveId: number, date: Date, teamId: number) {
    const isPositive = probability(0.6);
    const narrative = getNarrative('weekly', isPositive ? 'positive' : 'negative', { team: 'votre club' });
    const team = await db.teams.get(teamId);
    if (!team) return;

    if (narrative.title === "Mécénat inattendu") await db.teams.update(teamId, { budget: team.budget + 100 });
    else if (narrative.title === "Ballons crevés") await db.teams.update(teamId, { budget: Math.max(0, team.budget - 20) });
    else if (narrative.title === "Critique acerbe") await db.teams.update(teamId, { confidence: Math.max(0, team.confidence - 5) });
    else if (narrative.title === "Hymne du club") await db.teams.update(teamId, { reputation: Math.min(100, team.reputation + 2) });

    const state = await db.gameState.get(saveId);
    await this.addNews(saveId, { 
      day: state?.day || 0,
      date, 
      title: narrative.title || "Nouvelles du club", 
      content: narrative.content, 
      type: isPositive ? 'CLUB' : 'PRESS', 
      importance: 2 
    });
  }
};
