import { db, Player } from '@/db/db';
import { TeamRatings } from '../types';
import { clamp } from '@/utils/math';
import { TACTIC_DEFINITIONS } from './tactics';
import { NewsService } from '@/services/news-service';
import { getNarrative } from '@/data/narratives';

const ratingsCache = new Map<string, { ratings: TeamRatings; timestamp: number }>();

function getCacheKey(starters: Player[], tactic: string): string {
  const ids = starters.map(p => p.id).sort().join(',');
  return `${ids}-${tactic}`;
}

function calculateSector(starters: Player[], weights: Record<Player['position'], number>, bonus: number = 1.0): number {
  return starters.reduce((acc, p) => acc + (p.skill * (weights[p.position] || 0) * (p.condition / 100)), 0) * bonus;
}

export function calculateTeamRatings(
  players: Player[],
  tactic: TeamRatings['tacticType'] = 'NORMAL',
  saveId?: number,
  date?: Date,
): TeamRatings {
  let starters = players.filter(p => p.isStarter);
  let wasRandom = false;
  
  if (starters.length < 11) {
    const remainingCount = 11 - starters.length;
    const availablePlayers = players.filter(p => !p.isStarter);
    const shuffled = [...availablePlayers].sort(() => Math.random() - 0.5);
    starters = [...starters, ...shuffled.slice(0, remainingCount)];
    wasRandom = true;
  }

  // Si on a les infos de session et que c'est du hasard, on prévient le joueur via une news
  if (wasRandom && saveId && date) {
    const narrative = getNarrative('board', 'randomSquad');
    NewsService.addNews(saveId, {
      date,
      title: narrative.title || "ALERTE TACTIQUE",
      content: narrative.content,
      type: 'BOARD',
      importance: 2
    });
  }

  const cacheKey = getCacheKey(starters, tactic);
  const cached = ratingsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 60000) return cached.ratings;

  const baseRatings: TeamRatings = {
    midfield: calculateSector(starters, { GK: 0.05, DEF: 0.15, MID: 1.0, FWD: 0.2 }),
    attackCenter: calculateSector(starters, { GK: 0, DEF: 0.05, MID: 0.4, FWD: 1.0 }),
    attackLeft: calculateSector(starters, { GK: 0, DEF: 0.1, MID: 0.5, FWD: 0.8 }),
    attackRight: calculateSector(starters, { GK: 0, DEF: 0.1, MID: 0.5, FWD: 0.8 }),
    defenseCenter: calculateSector(starters, { GK: 1.0, DEF: 1.0, MID: 0.3, FWD: 0 }),
    defenseLeft: calculateSector(starters, { GK: 0.5, DEF: 0.8, MID: 0.2, FWD: 0 }),
    defenseRight: calculateSector(starters, { GK: 0.5, DEF: 0.8, MID: 0.2, FWD: 0 }),
    setPieces: starters.reduce((acc, p) => acc + p.stats.shooting, 0) / 11,
    tacticSkill: 10,
    tacticType: tactic,
  };

  // AUGMENTÉ DE 5 À 20 POUR ÉVITER LE PLAFONNEMENT À 20 TROP RAPIDE (POSSESSION 50/50)
  const DIVIDER = 20; 
  const ratings = { ...baseRatings };
  const sectors: (keyof TeamRatings)[] = ['midfield', 'attackLeft', 'attackCenter', 'attackRight', 'defenseLeft', 'defenseCenter', 'defenseRight'];
  for (const sector of sectors) { (ratings as any)[sector] = clamp((baseRatings as any)[sector] / DIVIDER, 1, 20); }
  
  // Set pieces conserve son propre diviseur car l'échelle est différente (moyenne directe)
  ratings.setPieces = clamp(ratings.setPieces / 5, 1, 20);

  const effect = TACTIC_DEFINITIONS[tactic];
  for (const [key, multiplier] of Object.entries(effect)) {
    (ratings as any)[key] *= multiplier;
    (ratings as any)[key] = clamp((ratings as any)[key], 1, 20);
  }

  ratingsCache.set(cacheKey, { ratings, timestamp: Date.now() });
  return ratings;
}
