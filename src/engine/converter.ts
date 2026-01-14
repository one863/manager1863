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

function calculateSector(
  starters: Player[], 
  weights: Record<Player['position'], number>, 
  targetSide: 'L' | 'C' | 'R' | 'ALL',
  bonus: number = 1.0
): number {
  return starters.reduce((acc, p) => {
      let contribution = p.skill * (weights[p.position] || 0) * (p.condition / 100);
      
      let sideFactor = 1.0;
      const pSide = p.side || 'C'; 

      if (targetSide !== 'ALL') {
          if (pSide === targetSide) {
              sideFactor = 1.0;
          } else if (pSide === 'C' || targetSide === 'C') {
              // Joueur Axial sur le côté ou Joueur de Côté dans l'axe : Malus léger (75%)
              sideFactor = 0.75;
          } else {
              // Côté opposé (G vs D) : Malus fort (25%)
              sideFactor = 0.25;
          }
      }
      
      return acc + (contribution * sideFactor);
  }, 0) * bonus;
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

  // Analyse structurelle pour les malus tactiques
  const hasGK = starters.some(p => p.position === 'GK');
  const gkBonus = hasGK ? 1.0 : 0.2; 

  const baseRatings: TeamRatings = {
    midfield: calculateSector(starters, { GK: 0, DEF: 0.2, MID: 1.0, FWD: 0.2 }, 'ALL'),
    
    attackCenter: calculateSector(starters, { GK: 0, DEF: 0, MID: 0.3, FWD: 1.0 }, 'C'),
    attackLeft: calculateSector(starters, { GK: 0, DEF: 0.1, MID: 0.9, FWD: 0.5 }, 'L'),
    attackRight: calculateSector(starters, { GK: 0, DEF: 0.1, MID: 0.9, FWD: 0.5 }, 'R'),
    
    defenseCenter: calculateSector(starters, { GK: 1.0, DEF: 1.0, MID: 0.3, FWD: 0 }, 'C') * gkBonus,
    defenseLeft: calculateSector(starters, { GK: 0.1, DEF: 0.9, MID: 0.4, FWD: 0 }, 'L'),
    defenseRight: calculateSector(starters, { GK: 0.1, DEF: 0.9, MID: 0.4, FWD: 0 }, 'R'),
    
    setPieces: starters.reduce((acc, p) => acc + p.stats.shooting, 0) / 11,
    tacticSkill: 10,
    tacticType: tactic,
  };

  const DIVIDER = 20; 
  const ratings = { ...baseRatings };
  const sectors: (keyof TeamRatings)[] = ['midfield', 'attackLeft', 'attackCenter', 'attackRight', 'defenseLeft', 'defenseCenter', 'defenseRight'];
  for (const sector of sectors) { (ratings as any)[sector] = clamp((baseRatings as any)[sector] / DIVIDER, 1, 20); }
  
  ratings.setPieces = clamp(ratings.setPieces / 5, 1, 20);

  const effect = TACTIC_DEFINITIONS[tactic];
  for (const [key, multiplier] of Object.entries(effect)) {
    (ratings as any)[key] *= multiplier;
    (ratings as any)[key] = clamp((ratings as any)[key], 1, 20);
  }

  ratingsCache.set(cacheKey, { ratings, timestamp: Date.now() });
  return ratings;
}
