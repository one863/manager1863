import { db, Player } from '@/db/db';
import { randomInt, probability, clamp } from '@/utils/math';

/**
 * Service gérant l'évolution des joueurs via l'entraînement.
 */
export const TrainingService = {
  /**
   * Entraîne l'ensemble d'un groupe selon un focus spécifique.
   */
  async trainSquad(
    saveId: number,
    teamId: number,
    focus: 'PHYSICAL' | 'TECHNICAL' | 'TACTICAL',
  ) {
    const players = await db.players
      .where('[saveId+teamId]')
      .equals([saveId, teamId])
      .toArray();

    const trainingResults = [];

    for (const player of players) {
      // 1. Coût en énergie (L'entraînement fatigue)
      const energyCost = randomInt(15, 25);
      const newEnergy = Math.max(0, player.energy - energyCost);

      // 2. Probabilité de gain (Dépend de l'âge : les jeunes progressent plus vite)
      // Base 30% de chance + bonus jeunesse
      const youthBonus = clamp((25 - player.age) * 0.05, 0, 0.4);
      const chance = 0.3 + youthBonus;

      let statGained = '';
      let gainAmount = 0;

      if (probability(chance)) {
        gainAmount = 1;

        // Déterminer quelle stat augmente
        const stats = player.stats;
        if (focus === 'PHYSICAL') {
          const choices: (keyof typeof stats)[] = [
            'speed',
            'strength',
            'stamina',
          ];
          const picked = choices[randomInt(0, 2)];
          stats[picked] = clamp(stats[picked] + 1, 1, 99);
          statGained = picked;
        } else if (focus === 'TECHNICAL') {
          const choices: (keyof typeof stats)[] = [
            'shooting',
            'passing',
            'dribbling',
            'defense',
          ];
          const picked = choices[randomInt(0, 3)];
          stats[picked] = clamp(stats[picked] + 1, 1, 99);
          statGained = picked;
        }

        // Recalcul du skill global (moyenne)
        const avgSkill = Math.round(
          (stats.speed +
            stats.strength +
            stats.stamina +
            stats.shooting +
            stats.passing +
            stats.dribbling +
            stats.defense) /
            7,
        );

        await db.players.update(player.id!, {
          stats: stats,
          skill: avgSkill,
          energy: newEnergy,
        });

        trainingResults.push({ name: player.lastName, stat: statGained });
      } else {
        // Juste mise à jour énergie
        await db.players.update(player.id!, { energy: newEnergy });
      }
    }

    return trainingResults;
  },
};
