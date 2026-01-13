import { db, Player } from '@/db/db';
import { TeamRatings, MatchResult, MatchEvent } from '../types';
import { randomInt, probability, getRandomElement } from '@/utils/math';
import { getNarrative } from '@/data/narratives'; // NOUVEAU

export async function simulateMatch(
  home: TeamRatings,
  away: TeamRatings,
  homeTeamId: number,
  awayTeamId: number,
  homePlayers: Player[],
  awayPlayers: Player[],
): Promise<MatchResult> {
  const result: MatchResult = {
    homeScore: 0, awayScore: 0, homePossession: 0,
    events: [],
    stats: { homeChances: 0, awayChances: 0 },
  };

  const totalMidfield = home.midfield + away.midfield;
  result.homePossession = Math.round((home.midfield / totalMidfield) * 100);

  const totalChances = 10;
  for (let i = 0; i < totalChances; i++) {
    const minute = randomInt(1, 90);
    const controllingTeam = Math.random() < result.homePossession / 100 ? 'home' : 'away';

    const attackingRatings = controllingTeam === 'home' ? home : away;
    const defendingRatings = controllingTeam === 'home' ? away : home;
    const attackingId = controllingTeam === 'home' ? homeTeamId : awayTeamId;
    const attackingPlayers = controllingTeam === 'home' ? homePlayers : awayPlayers;

    if (controllingTeam === 'home') result.stats.homeChances++;
    else result.stats.awayChances++;

    const sectorRoll = Math.random();
    let sector: 'Left' | 'Center' | 'Right' = sectorRoll < 0.33 ? 'Left' : sectorRoll < 0.66 ? 'Right' : 'Center';

    const attackPower = (attackingRatings as any)[`attack${sector}`];
    const defensePower = (defendingRatings as any)[`defense${sector}`];

    const scoringChance = attackPower / (attackPower + defensePower);

    if (probability(scoringChance)) {
      if (controllingTeam === 'home') result.homeScore++;
      else result.awayScore++;

      const scorers = attackingPlayers.filter(p => p.position === 'FWD' || p.position === 'MID');
      const scorer = getRandomElement(scorers.length > 0 ? scorers : attackingPlayers);

      result.events.push({
        minute, type: 'GOAL', teamId: attackingId, scorerId: scorer.id, scorerName: scorer.lastName,
        description: getNarrative('match', 'goal', { player: scorer.lastName }).content // UTILISATION DU MOTEUR
      });
    } else if (probability(0.4)) {
      const player = getRandomElement(attackingPlayers);
      result.events.push({
        minute, type: 'MISS', teamId: attackingId,
        description: getNarrative('match', 'miss', { player: player.lastName }).content // UTILISATION DU MOTEUR
      });
    }
  }

  // Événement d'ambiance
  if (probability(0.5)) {
    result.events.push({
      minute: randomInt(5, 85),
      type: 'SE',
      teamId: 0,
      description: getNarrative('match', 'ambient', { team: homeTeamId === 0 ? 'Home' : 'Away' }).content
    });
  }

  result.events.sort((a, b) => a.minute - b.minute);
  return result;
}
