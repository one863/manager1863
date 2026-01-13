import { db, NewsArticle, Player } from '@/db/db';
import { getNarrative } from '@/data/narratives';
import { probability, getRandomElement } from '@/utils/math';
import i18next from 'i18next';

export const NewsService = {
  async addNews(saveId: number, article: Omit<NewsArticle, 'id' | 'saveId' | 'isRead'>) {
    return await db.news.add({ ...article, saveId, isRead: false });
  },

  async getLatestNews(saveId: number, limit: number = 5) {
    const gameState = await db.gameState.get(saveId);
    if (!gameState) return [];

    const allNews = await db.news.where('saveId').equals(saveId).toArray();
    const visibleNews = allNews.filter(n => n.day <= gameState.day);
    visibleNews.sort((a, b) => b.day - a.day);
    
    return visibleNews.slice(0, limit);
  },

  async getAllNews(saveId: number) {
    const gameState = await db.gameState.get(saveId);
    if (!gameState) return [];

    const allNews = await db.news.where('saveId').equals(saveId).toArray();
    const visibleNews = allNews.filter(n => n.day <= gameState.day);
    visibleNews.sort((a, b) => b.day - a.day);
    
    return visibleNews;
  },

  async markAsRead(newsId: number) {
    return await db.news.update(newsId, { isRead: true });
  },

  async cleanupOldNews(saveId: number, currentSeason: number) {
    const count = await db.news.where('saveId').equals(saveId).count();
    const MAX_NEWS = 200;
    
    if (count > MAX_NEWS) {
      const deleteCount = count - MAX_NEWS;
      const oldestNews = await db.news.where('saveId').equals(saveId).limit(deleteCount).primaryKeys();
      await db.news.bulkDelete(oldestNews);
    }
  },

  async processDailyNews(saveId: number, day: number, date: Date, teamId: number) {
    if (day % 7 === 1) await this.generateWeeklyEvents(saveId, date, teamId, day);
    if (day % 7 === 3) await this.generateTrainingReport(saveId, date, teamId, day);
    if (day % 7 === 0 && day > 0) await this.generateSundayBoardReport(saveId, date, teamId, day);
  },

  async generateMatchNews(saveId: number, date: Date, teamName: string, opponentName: string, myScore: number, oppScore: number) {
    const isWin = myScore > oppScore;
    const isDraw = myScore === oppScore;
    const type = isWin ? 'victory' : isDraw ? 'draw' : 'loss';
    
    const userTeam = await db.teams.where('saveId').equals(saveId).and(t => t.name === teamName).first();
    const opponentTeam = await db.teams.where('saveId').equals(saveId).and(t => t.name === opponentName).first();
    const state = await db.gameState.get(saveId);
    
    // Création des liens riches pour les équipes
    const teamLink = userTeam ? `[[team:${userTeam.id}|${teamName}]]` : teamName;
    const opponentLink = opponentTeam ? `[[team:${opponentTeam.id}|${opponentName}]]` : opponentName;

    const narrative = getNarrative('news', type, { 
      team: teamLink, 
      opponent: opponentLink, 
      score: `${myScore}-${oppScore}`, 
      stadium: userTeam?.stadiumName || "le stade" 
    });

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
    const userTeam = await db.teams.where('saveId').equals(saveId).and(t => t.name === teamName).first();
    const opponentTeam = await db.teams.where('saveId').equals(saveId).and(t => t.name === opponentName).first();

    const teamLink = userTeam ? `[[team:${userTeam.id}|${teamName}]]` : teamName;
    const opponentLink = opponentTeam ? `[[team:${opponentTeam.id}|${opponentName}]]` : opponentName;

    const narrative = getNarrative('news', 'matchDay', { team: teamLink, opponent: opponentLink, stadium: stadiumName });
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

  async generateTrainingReport(saveId: number, date: Date, teamId: number, forcedDay?: number) {
    const players = await db.players.where('[saveId+teamId]').equals([saveId, teamId]).toArray();
    const topPlayer = getRandomElement(players);
    
    // Lien riche pour le joueur
    const playerLabel = topPlayer ? `[[player:${topPlayer.id}|${topPlayer.lastName}]]` : "L'effectif";
    
    const narrative = getNarrative('training', 'wednesdayReport', { player: playerLabel });
    const state = await db.gameState.get(saveId);

    await this.addNews(saveId, { 
      day: forcedDay || state?.day || 0,
      date, 
      title: narrative.title || "Rapport d'entraînement", 
      content: narrative.content, 
      type: 'CLUB', 
      importance: 1 
    });
  },

  async generateSundayBoardReport(saveId: number, date: Date, teamId: number, forcedDay?: number) {
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
      team: team.name, // On pourrait mettre un lien mais c'est l'équipe du joueur
      goal: team.seasonGoal || "Non défini"
    });

    await this.addNews(saveId, { 
      day: forcedDay || state?.day || 0,
      date, 
      title: narrative.title || "Bilan de la Direction", 
      content: narrative.content, 
      type: 'BOARD', 
      importance: 2 
    });
  },

  async generateWeeklyEvents(saveId: number, date: Date, teamId: number, forcedDay?: number) {
    const isPositive = probability(0.6);
    const narrative = getNarrative('weekly', isPositive ? 'positive' : 'negative', { team: 'votre club' });
    const team = await db.teams.get(teamId);
    if (!team) return;

    if (narrative.title === "Mécénat inattendu" || narrative.title?.includes("Patronage")) await db.teams.update(teamId, { budget: team.budget + 100 });
    else if (narrative.title === "Ballons crevés" || narrative.title?.includes("Balls")) await db.teams.update(teamId, { budget: Math.max(0, team.budget - 20) });
    else if (narrative.title === "Critique acerbe" || narrative.title?.includes("Criticism")) await db.teams.update(teamId, { confidence: Math.max(0, team.confidence - 5) });
    else if (narrative.title === "Hymne du club" || narrative.title?.includes("Anthem")) await db.teams.update(teamId, { reputation: Math.min(100, team.reputation + 2) });

    const state = await db.gameState.get(saveId);
    await this.addNews(saveId, { 
      day: forcedDay || state?.day || 0,
      date, 
      title: narrative.title || "Nouvelles du club", 
      content: narrative.content, 
      type: isPositive ? 'CLUB' : 'PRESS', 
      importance: 2 
    });
  }
};
