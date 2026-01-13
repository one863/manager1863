import { Player } from '@/db/db';
import { TeamRatings, MatchResult } from '../types';
import { randomInt, probability, getRandomElement } from '@/utils/math';
import { getNarrative } from '@/data/narratives';

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

  // Sécurité : éviter division par zéro
  const totalMidfield = (home.midfield || 1) + (away.midfield || 1);
  result.homePossession = Math.round((home.midfield / totalMidfield) * 100);

  // MOTEUR PASSÉ À 12 ACTIONS
  const totalChances = 12;
  
  // Générer les minutes des actions de manière équilibrée sur le match
  const actionMinutes = Array.from({ length: totalChances }, (_, i) => {
    const range = 90 / totalChances;
    return randomInt(Math.floor(i * range) + 1, Math.floor((i + 1) * range));
  }).sort((a, b) => a - b);

  for (let i = 0; i < totalChances; i++) {
    const minute = actionMinutes[i];
    const controllingTeam = Math.random() < result.homePossession / 100 ? 'home' : 'away';

    const attackingRatings = controllingTeam === 'home' ? home : away;
    const defendingRatings = controllingTeam === 'home' ? away : home;
    const attackingId = controllingTeam === 'home' ? homeTeamId : awayTeamId;
    const attackingPlayers = controllingTeam === 'home' ? homePlayers : awayPlayers;

    if (attackingPlayers.length === 0) continue;

    if (controllingTeam === 'home') result.stats.homeChances++;
    else result.stats.awayChances++;

    const sectorRoll = Math.random();
    let sector: 'Left' | 'Center' | 'Right' = sectorRoll < 0.33 ? 'Left' : sectorRoll < 0.66 ? 'Right' : 'Center';

    const attackPower = (attackingRatings as any)[`attack${sector}`] || 1;
    const defensePower = (defendingRatings as any)[`defense${sector}`] || 1;

    // Formule de probabilité basée sur les ratings
    const scoringChance = attackPower / (attackPower + defensePower);

    if (probability(scoringChance)) {
      if (controllingTeam === 'home') result.homeScore++;
      else result.awayScore++;

      const scorers = attackingPlayers.filter(p => p.position === 'FWD' || p.position === 'MID');
      const scorer = getRandomElement(scorers.length > 0 ? scorers : attackingPlayers);

      result.events.push({
        minute, type: 'GOAL', teamId: attackingId, scorerId: scorer.id, scorerName: scorer.lastName,
        description: getNarrative('match', 'goal', { player: scorer.lastName }).content
      });
    } else {
      // ACTIONS ÉCHOUÉES (MISSES) - Toujours en générer si ce n'est pas un but
      const players = attackingPlayers.filter(p => p.position !== 'GK');
      const player = getRandomElement(players.length > 0 ? players : attackingPlayers);
      
      result.events.push({
        minute, type: 'MISS', teamId: attackingId,
        description: getNarrative('match', 'miss', { player: player.lastName }).content
      });
    }
  }

  // Événements d'ambiance supplémentaires pour remplir les "vides"
  if (probability(0.7)) {
    result.events.push({
      minute: randomInt(5, 85),
      type: 'SE',
      teamId: 0,
      description: getNarrative('match', 'ambient', { team: 'Public' }).content
    });
  }

  result.events.sort((a, b) => a.minute - b.minute);
  return result;
}
