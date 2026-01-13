import { Player } from '@/db/db';
import { TeamRatings } from '../types';
import { clamp } from '@/utils/math';

/**
 * Logique de conversion des statistiques des joueurs en notes de secteurs (Attaque, Milieu, Défense).
 */

export function calculateTeamRatings(players: Player[], tactic: TeamRatings['tacticType'] = 'NORMAL'): TeamRatings {
  const ratings: TeamRatings = {
    midfield: 0,
    attackLeft: 0,
    attackCenter: 0,
    attackRight: 0,
    defenseLeft: 0,
    defenseCenter: 0,
    defenseRight: 0,
    setPieces: 0,
    tacticSkill: 10,
    tacticType: tactic
  };

  // Sélection des 11 meilleurs joueurs (simplification)
  const starters = [...players].sort((a, b) => b.skill - a.skill).slice(0, 11);

  starters.forEach(p => {
    const { stats, position } = p;
    
    // 1. MILIEU (Possession)
    if (position === 'MID') ratings.midfield += (stats.passing * 0.6 + stats.stamina * 0.4);
    else ratings.midfield += (stats.passing * 0.2);

    // 2. ATTAQUE
    if (position === 'FWD') {
      ratings.attackCenter += (stats.shooting * 0.8 + stats.passing * 0.2);
      ratings.attackLeft += (stats.speed * 0.5 + stats.dribbling * 0.5) * 0.5;
      ratings.attackRight += (stats.speed * 0.5 + stats.dribbling * 0.5) * 0.5;
    } else if (position === 'MID') {
      ratings.attackCenter += (stats.passing * 0.3);
      ratings.attackLeft += (stats.passing * 0.4 + stats.speed * 0.4) * 0.5;
      ratings.attackRight += (stats.passing * 0.4 + stats.speed * 0.4) * 0.5;
    }

    // 3. DÉFENSE
    if (position === 'GK') {
      ratings.defenseCenter += (stats.defense * 0.8 + stats.strength * 0.2);
      ratings.defenseLeft += (stats.defense * 0.4);
      ratings.defenseRight += (stats.defense * 0.4);
    } else if (position === 'DEF') {
      ratings.defenseCenter += (stats.defense * 0.7 + stats.strength * 0.3);
      ratings.defenseLeft += (stats.defense * 0.4 + stats.speed * 0.3);
      ratings.defenseRight += (stats.defense * 0.4 + stats.speed * 0.3);
    } else if (position === 'MID') {
      ratings.defenseCenter += (stats.defense * 0.3 + stats.stamina * 0.2);
    }

    ratings.setPieces += stats.shooting;
  });

  const DIVIDER = 15; 
  ratings.midfield = clamp(ratings.midfield / DIVIDER, 1, 20);
  ratings.attackLeft = clamp(ratings.attackLeft / DIVIDER, 1, 20);
  ratings.attackCenter = clamp(ratings.attackCenter / DIVIDER, 1, 20);
  ratings.attackRight = clamp(ratings.attackRight / DIVIDER, 1, 20);
  ratings.defenseLeft = clamp(ratings.defenseLeft / DIVIDER, 1, 20);
  ratings.defenseCenter = clamp(ratings.defenseCenter / DIVIDER, 1, 20);
  ratings.defenseRight = clamp(ratings.defenseRight / DIVIDER, 1, 20);
  ratings.setPieces = clamp(ratings.setPieces / (starters.length * 5), 1, 20);

  // Bonus TACTIQUE
  if (tactic === 'AIM') {
    ratings.attackCenter *= 1.2;
    ratings.attackLeft *= 0.8;
    ratings.attackRight *= 0.8;
    ratings.defenseCenter *= 0.9;
  } else if (tactic === 'AOW') {
    ratings.attackCenter *= 0.8;
    ratings.attackLeft *= 1.2;
    ratings.attackRight *= 1.2;
    ratings.defenseCenter *= 0.9;
  }

  return ratings;
}
