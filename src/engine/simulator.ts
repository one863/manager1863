import { db, Player } from '@/db/db';
import { TeamRatings, MatchResult, MatchEvent } from '../types';
import { randomInt, probability, getRandomElement } from '@/utils/math';

/**
 * Moteur de simulation de match.
 * Calcule les occasions de but basées sur les notes des secteurs.
 */

export async function simulateMatch(
    home: TeamRatings, 
    away: TeamRatings, 
    homeTeamId: number, 
    awayTeamId: number,
    homePlayers: Player[],
    awayPlayers: Player[]
): Promise<MatchResult> {
  
  const result: MatchResult = {
    homeScore: 0,
    awayScore: 0,
    homePossession: 0,
    events: [],
    stats: { homeChances: 0, awayChances: 0 }
  };

  // 1. CALCUL DE LA POSSESSION
  const totalMidfield = home.midfield + away.midfield;
  result.homePossession = Math.round((home.midfield / totalMidfield) * 100);

  // 2. GÉNÉRATION DES OCCASIONS
  const totalChances = 10;
  for (let i = 0; i < totalChances; i++) {
    const minute = randomInt(1, 90);
    const controllingTeam = Math.random() < (result.homePossession / 100) ? 'home' : 'away';
    
    const attackingRatings = controllingTeam === 'home' ? home : away;
    const defendingRatings = controllingTeam === 'home' ? away : home;
    const attackingId = controllingTeam === 'home' ? homeTeamId : awayTeamId;
    const attackingPlayers = controllingTeam === 'home' ? homePlayers : awayPlayers;

    if (controllingTeam === 'home') result.stats.homeChances++;
    else result.stats.awayChances++;

    const sectorRoll = Math.random();
    let sector: 'Left' | 'Center' | 'Right';
    if (sectorRoll < 0.33) sector = 'Left';
    else if (sectorRoll < 0.66) sector = 'Right';
    else sector = 'Center';

    const attackPower = (attackingRatings as any)[`attack${sector}`];
    const defensePower = (defendingRatings as any)[`defense${sector}`];

    const scoringChance = attackPower / (attackPower + defensePower);

    if (probability(scoringChance)) {
      if (controllingTeam === 'home') result.homeScore++;
      else result.awayScore++;

      // Sélection d'un buteur parmi les attaquants et milieux
      const scorers = attackingPlayers.filter(p => p.position === 'FWD' || p.position === 'MID');
      const scorer = getRandomElement(scorers.length > 0 ? scorers : attackingPlayers);

      result.events.push({
        minute,
        type: 'GOAL',
        teamId: attackingId,
        scorerId: scorer.id,
        scorerName: scorer.lastName,
        description: generateCommentary('GOAL', scorer.lastName, sector)
      });
    } else if (probability(0.4)) {
      // Occasion manquée : on prend un joueur aléatoire
      const player = getRandomElement(attackingPlayers);
      result.events.push({
        minute,
        type: 'MISS',
        teamId: attackingId,
        description: generateCommentary('MISS', player.lastName, sector)
      });
    }
  }

  // 3. ÉVÉNEMENTS SPÉCIAUX (Blessures, Cartons - Simulation d'ambiance 1863)
  if (probability(0.3)) {
      const minute = randomInt(10, 80);
      const team = Math.random() > 0.5 ? 'home' : 'away';
      const player = getRandomElement(team === 'home' ? homePlayers : awayPlayers);
      result.events.push({
          minute,
          type: 'SE',
          teamId: team === 'home' ? homeTeamId : awayTeamId,
          description: `${player.lastName} reçoit un avertissement du capitaine adverse pour un jeu trop vigoureux.`
      });
  }

  result.events.sort((a, b) => a.minute - b.minute);
  return result;
}

function generateCommentary(type: 'GOAL' | 'MISS', playerName: string, sector: string): string {
  const s = sector === 'Center' ? 'plein axe' : (sector === 'Left' ? 'sur l\'aile gauche' : 'sur l\'aile droite');

  const goalTexts = [
    `${playerName} s'échappe ${s} et expédie le cuir au fond des filets !`,
    `Magnifique reprise de ${playerName} qui trompe le gardien !`,
    `Le stade exulte ! ${playerName} marque d'une frappe limpide.`,
    `Quelle action ! ${playerName} finit le travail après un beau mouvement collectif.`
  ];
  
  const missTexts = [
    `${playerName} tente sa chance ${s} mais le ballon s'envole au-dessus de la barre.`,
    `Grosse occasion pour ${playerName}, mais sa frappe manque de précision !`,
    `${playerName} bute sur le gardien après une incursion ${s}.`,
    `La défense s'interpose in extremis devant ${playerName} !`
  ];

  return getRandomElement(type === 'GOAL' ? goalTexts : missTexts);
}
