import { db, Player, Team } from '@/db/db';
import { generatePlayer } from '@/data/players-generator';
import { randomInt } from '@/utils/math';

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

  /**
   * Met à jour le marché des transferts en fonction de la réputation de l'équipe.
   * Supprime les joueurs trop faibles (hors scope) et génère de nouveaux joueurs adaptés.
   */
  async refreshMarketForReputation(saveId: number, reputation: number) {
    // Calibrage : Niveau cible = Réputation + 15 (Pour proposer des améliorations)
    // Avec un plancher à 35 (niveau min Div 6)
    const targetSkill = Math.max(reputation + 15, 35);
    const minSkill = targetSkill - 10;
    const maxSkill = targetSkill + 15;

    // 1. Nettoyage : Supprimer les joueurs du marché (teamId = -1) qui sont hors de la fourchette pertinente
    // Cela simule le fait que les joueurs trop nuls ne intéressent plus le club, 
    // et les joueurs trop forts ne veulent pas venir.
    const outdatedPlayers = await db.players
      .where('[saveId+teamId+skill]')
      .between([saveId, -1, 0], [saveId, -1, 100]) // Tous les joueurs du marché
      .filter(p => p.skill < minSkill || p.skill > maxSkill) // Filtrage manuel car between est sur l'index composé
      .primaryKeys();

    if (outdatedPlayers.length > 0) {
      await db.players.bulkDelete(outdatedPlayers);
    }

    // 2. Vérifier combien de joueurs restent
    const currentMarketCount = await db.players
      .where('[saveId+teamId]')
      .equals([saveId, -1])
      .count();

    // 3. Compléter si nécessaire (maintenir environ 15-20 joueurs)
    const TARGET_MARKET_SIZE = 15;
    if (currentMarketCount < TARGET_MARKET_SIZE) {
      const needed = TARGET_MARKET_SIZE - currentMarketCount;
      await this.generateMarket(saveId, needed, targetSkill);
    }
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

  async sellPlayer(playerId: number, teamId: number) {
    const player = await db.players.get(playerId);
    const team = await db.teams.get(teamId);
    if (!player || !team) throw new Error('Données introuvables');

    const sellValue = Math.round(player.marketValue * 0.7);

    await db.transaction('rw', db.players, db.teams, async () => {
      await db.players.delete(playerId);
      await db.teams.update(teamId, { budget: team.budget + sellValue });
    });
    return sellValue;
  }
};
