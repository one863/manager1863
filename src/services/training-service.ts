import { db, Player } from '@/db/db';
import { randomInt, probability, clamp } from '@/utils/math';
import { NewsService } from './news-service';

export const TrainingService = {
  async startTrainingCycle(teamId: number, focus: 'PHYSICAL' | 'TECHNICAL', currentDay: number) {
    const team = await db.teams.get(teamId);
    if (!team) return { success: false };
    if (team.trainingEndDay) return { success: false, error: 'Entraînement déjà en cours' };

    await db.teams.update(teamId, {
      trainingEndDay: currentDay + 7,
      trainingFocus: focus
    });

    return { success: true, endDay: currentDay + 7 };
  },

  async processDailyUpdates(teamId: number, saveId: number, currentDay: number, currentDate: Date) {
    const team = await db.teams.get(teamId);
    if (!team || !team.trainingEndDay || !team.trainingFocus) return;

    if (team.trainingEndDay > currentDay) return;

    const focus = team.trainingFocus;
    const players = await db.players.where('[saveId+teamId]').equals([saveId, teamId]).toArray();
    const trainingResults = [];

    for (const player of players) {
      const energyCost = randomInt(10, 20);
      const newEnergy = Math.max(0, player.energy - energyCost);
      const youthBonus = clamp((25 - player.age) * 0.05, 0, 0.4);
      const chance = 0.35 + youthBonus;

      const stats = { ...player.stats };

      if (probability(chance)) {
        let statGained = '';
        if (focus === 'PHYSICAL') {
          const choices: (keyof typeof stats)[] = ['speed', 'strength', 'stamina'];
          const picked = choices[randomInt(0, 2)];
          stats[picked] = clamp(stats[picked] + 1, 1, 99);
          statGained = picked;
        } else if (focus === 'TECHNICAL') {
          const choices: (keyof typeof stats)[] = ['shooting', 'passing', 'dribbling', 'defense'];
          const picked = choices[randomInt(0, 3)];
          stats[picked] = clamp(stats[picked] + 1, 1, 99);
          statGained = picked;
        }

        const avgSkill = Math.round((stats.speed + stats.strength + stats.stamina + stats.shooting + stats.passing + stats.dribbling + stats.defense) / 7);

        await db.players.update(player.id!, { stats, skill: avgSkill, energy: newEnergy });
        trainingResults.push(player.lastName);
      } else {
        await db.players.update(player.id!, { energy: newEnergy });
      }
    }

    await db.teams.update(teamId, { trainingEndDay: undefined, trainingFocus: undefined });

    await NewsService.addNews(saveId, {
      day: currentDay, date: currentDate,
      title: "FIN DU CYCLE D'ENTRAÎNEMENT",
      content: `Le cycle de focus ${focus} est terminé. ${trainingResults.length} joueurs ont progressé.`,
      type: 'CLUB', importance: 2
    });

    return trainingResults;
  }
};
