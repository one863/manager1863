import { db, Player, Team } from '@/db/db';
import { generatePlayer } from '@/data/players-generator';

/**
 * Service gérant le marché des transferts et les transactions.
 */
export const TransferService = {
  
  /**
   * Génère une liste de joueurs disponibles sur le marché.
   */
  async generateMarket(saveId: number, count: number = 10, averageSkill: number = 50) {
    const players = [];
    for (let i = 0; i < count; i++) {
        // On génère des joueurs sans teamId (joueurs libres)
        const p = generatePlayer(averageSkill);
        players.push({
            ...p,
            saveId,
            teamId: -1 // -1 indique qu'ils sont sur le marché des transferts
        });
    }
    return await db.players.bulkAdd(players);
  },

  /**
   * Effectue l'achat d'un joueur par le club de l'utilisateur.
   */
  async buyPlayer(playerId: number, buyerTeamId: number) {
    const player = await db.players.get(playerId);
    const buyer = await db.teams.get(buyerTeamId);

    if (!player || !buyer) throw new Error("Joueur ou Équipe introuvable");
    if (buyer.budget < player.marketValue) throw new Error("Budget insuffisant");

    await db.transaction('rw', db.players, db.teams, async () => {
        // 1. Déduire le budget
        await db.teams.update(buyerTeamId, {
            budget: buyer.budget - player.marketValue
        });

        // 2. Assigner le joueur au club
        await db.players.update(playerId, {
            teamId: buyerTeamId
        });
    });

    return true;
  }
};
