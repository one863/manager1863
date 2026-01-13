import { db, NewsArticle } from '@/db/db';

/**
 * Service gérant la génération et la gestion des dépêches de presse.
 */
export const NewsService = {
  
  async addNews(saveId: number, article: Omit<NewsArticle, 'id' | 'saveId' | 'isRead'>) {
    return await db.news.add({
      ...article,
      saveId,
      isRead: false
    });
  },

  async getLatestNews(saveId: number, limit: number = 5) {
    return await db.news
      .where('saveId')
      .equals(saveId)
      .reverse()
      .limit(limit)
      .toArray();
  },

  async getAllNews(saveId: number) {
    return await db.news
      .where('saveId')
      .equals(saveId)
      .reverse()
      .toArray();
  },

  async markAsRead(newsId: number) {
    return await db.news.update(newsId, { isRead: true });
  },

  /**
   * Génère une dépêche automatique basée sur un événement.
   */
  async generateMatchNews(saveId: number, date: Date, teamName: string, opponentName: string, myScore: number, oppScore: number) {
    let title = "";
    let content = "";
    const isWin = myScore > oppScore;
    const isDraw = myScore === oppScore;

    if (isWin) {
      title = `Victoire historique pour ${teamName} !`;
      content = `Le match contre ${opponentName} s'est terminé sur un score de ${myScore}-${oppScore}. Les fans sont ravis !`;
    } else if (isDraw) {
      title = `Match nul entre ${teamName} et ${opponentName}`;
      content = `Les deux équipes se quittent sur un score de parité (${myScore}-${oppScore}). Un match disputé jusqu'au bout.`;
    } else {
      title = `${teamName} s'incline face à ${opponentName}`;
      content = `Défaite décevante ${myScore}-${oppScore}. Le manager devra revoir sa copie pour le prochain match.`;
    }

    await this.addNews(saveId, {
      date,
      title,
      content,
      type: 'PRESS',
      importance: isWin ? 2 : 1
    });
  }
};
