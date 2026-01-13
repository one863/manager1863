import { db, Player, Team } from '@/db/db';
import { generatePlayer } from '@/data/players-generator';

const MAX_SQUAD_SIZE = 25; // Limite d'effectif

export const TransferService = {
  async generateMarket(saveId: number, count: number = 10, averageSkill: number = 50) {
    const players = [];
    for (let i = 0; i < count; i++) {
      const p = generatePlayer(averageSkill);
      players.push({ ...p, saveId, teamId: -1 });
    }
    return await db.players.bulkAdd(players);
  },

  async buyPlayer(playerId: number, buyerTeamId: number) {
    const player = await db.players.get(playerId);
    const buyer = await db.teams.get(buyerTeamId);

    if (!player || !buyer) throw new Error('Joueur ou Équipe introuvable');
    if (buyer.budget < player.marketValue) throw new Error('Budget insuffisant');

    // Vérification de la taille de l'effectif
    const squadCount = await db.players.where('[saveId+teamId]').equals([player.saveId, buyerTeamId]).count();
    if (squadCount >= MAX_SQUAD_SIZE) throw new Error(`Effectif complet (${MAX_SQUAD_SIZE} joueurs max)`);

    await db.transaction('rw', db.players, db.teams, async () => {
      await db.teams.update(buyerTeamId, { budget: buyer.budget - player.marketValue });
      await db.players.update(playerId, { teamId: buyerTeamId, isStarter: false });
    });
    return true;
  },

  /**
   * Licencier ou vendre un joueur.
   * Si le joueur a une valeur > 0, on récupère 70% de sa valeur (revente).
   * Si on le licencie, on pourrait imaginer une petite indemnité à payer plus tard.
   */
  async sellPlayer(playerId: number, teamId: number) {
    const player = await db.players.get(playerId);
    const team = await db.teams.get(teamId);
    if (!player || !team) throw new Error('Données introuvables');

    const sellValue = Math.round(player.marketValue * 0.7);

    await db.transaction('rw', db.players, db.teams, async () => {
      // Le joueur retourne sur le marché ou est supprimé. Ici on le supprime pour libérer de la place.
      await db.players.delete(playerId);
      await db.teams.update(teamId, { budget: team.budget + sellValue });
    });
    return sellValue;
  }
};
