import { db, Player } from '@/db/db';
import { generateTeamSquad } from './players-generator';

export async function generateSquad(saveId: number, teamId: number, teamSkill: number) {
  const playersData = generateTeamSquad(teamSkill);
  const players = playersData.map((p) => ({
    ...p,
    saveId,
    teamId,
  })) as Player[];

  await db.players.bulkAdd(players);
}
