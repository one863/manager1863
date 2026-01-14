import { Player } from '@/db/db';
import { TeamRatings, MatchResult } from '../types';
import { randomInt, probability, getRandomElement, clamp } from '@/utils/math';
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

  // --- HOME ADVANTAGE (BONUS 5%) ---
  const HOME_BONUS = 1.05;
  const adjustedHomeMidfield = (home.midfield || 1) * HOME_BONUS;

  // --- FATIGUE CALCULATION (INITIAL AVG STAMINA) ---
  const getAvgStamina = (players: Player[]) => {
      const starters = players.filter(p => p.isStarter);
      if (starters.length === 0) return 80;
      return starters.reduce((acc, p) => acc + (p.stats.stamina || 50), 0) / starters.length;
  };
  const homeAvgStamina = getAvgStamina(homePlayers);
  const awayAvgStamina = getAvgStamina(awayPlayers);

  const totalMidfield = adjustedHomeMidfield + (away.midfield || 1);
  result.homePossession = Math.round((adjustedHomeMidfield / totalMidfield) * 100);

  // --- NOUVEAU SYSTÈME DE CYCLES (15 Cycles) ---
  const CYCLES = 15;
  const cycleDuration = 90 / CYCLES;
  
  for (let cycle = 0; cycle < CYCLES; cycle++) {
    const minute = Math.floor(cycle * cycleDuration) + randomInt(1, 4);
    
    // --- FATIGUE DYNAMIC FACTOR ---
    // Stamina 100 -> No penalty. Stamina 50 -> -25% rating at min 90.
    // Factor = 1 - ( (100 - stamina) / 200 ) * (minute / 90)
    const getFatigueFactor = (avgStamina: number) => {
        const decayRate = (100 - avgStamina) / 200; // ex: (100-50)/200 = 0.25
        return 1 - (decayRate * (minute / 90));
    };

    const homeFatigue = getFatigueFactor(homeAvgStamina);
    const awayFatigue = getFatigueFactor(awayAvgStamina);
    
    // Dynamic Midfield Rating
    const currentHomeMid = adjustedHomeMidfield * homeFatigue;
    const currentAwayMid = (away.midfield || 1) * awayFatigue;

    // --- Phase 0 : Bataille Territoriale ---
    const homeControlChance = currentHomeMid / (currentHomeMid + currentAwayMid);
    const controllingTeam = Math.random() < homeControlChance ? 'home' : 'away';
    
    // Select ratings for this cycle with fatigue applied
    const getFatiguedRatings = (base: TeamRatings, factor: number) => {
        // We only modify sector ratings, not tactical skill/type for now
        const r = { ...base };
        (r as any).attackLeft *= factor;
        (r as any).attackCenter *= factor;
        (r as any).attackRight *= factor;
        (r as any).defenseLeft *= factor;
        (r as any).defenseCenter *= factor;
        (r as any).defenseRight *= factor;
        return r;
    };

    const homeCycleRatings = getFatiguedRatings(home, homeFatigue);
    const awayCycleRatings = getFatiguedRatings(away, awayFatigue);

    const attackingRatings = controllingTeam === 'home' ? homeCycleRatings : awayCycleRatings;
    const defendingRatings = controllingTeam === 'home' ? awayCycleRatings : homeCycleRatings;
    const attackingId = controllingTeam === 'home' ? homeTeamId : awayTeamId;
    const attackingPlayers = controllingTeam === 'home' ? homePlayers : awayPlayers;
    const defendingPlayers = controllingTeam === 'home' ? awayPlayers : homePlayers;

    if (controllingTeam === 'home') result.stats.homeChances++;
    else result.stats.awayChances++;

    // --- Phase 1 : Type d'Action ---
    const actionRoll = Math.random();
    
    // 5% de chance d'un événement CPA
    if (actionRoll < 0.05) {
      handleSetPiece(result, minute, controllingTeam, attackingRatings, defendingRatings, attackingId, attackingPlayers);
      continue;
    }
    
    // 5% de chance d'un Événement Spécial (SE) - Réduit à 2-3% pour éviter la répétition
    if (actionRoll < 0.08) {
      handleSpecialEvent(result, minute, controllingTeam, attackingId, attackingPlayers);
      continue;
    }

    // Action Normale
    handleNormalAttack(result, minute, controllingTeam, attackingRatings, defendingRatings, attackingId, attackingPlayers, defendingPlayers);
  }

  // --- Mécanique de Contre-Attaque (Plafond Dynamique) ---
  if (result.homePossession > 60 && away.tacticType === 'CA') {
    handleCounterAttack(result, 'away', away, home, awayTeamId, awayPlayers, homePlayers);
  } else if (result.homePossession < 40 && home.tacticType === 'CA') {
    handleCounterAttack(result, 'home', home, away, homeTeamId, homePlayers, awayPlayers);
  }

  // --- Transitions Offensives ---
  if (probability(0.05)) {
    const pressTeam = home.tacticType === 'PRESSING' ? 'home' : (away.tacticType === 'PRESSING' ? 'away' : null);
    if (pressTeam) {
        const tId = pressTeam === 'home' ? homeTeamId : awayTeamId;
        const attPlayers = pressTeam === 'home' ? homePlayers : awayPlayers;
        const defPlayers = pressTeam === 'home' ? awayPlayers : homePlayers;
        result.events.push({
            minute: randomInt(10, 80),
            type: 'TRANSITION',
            teamId: tId,
            description: getNarrative('match', 'transition', { team: pressTeam === 'home' ? 'Home' : 'Away' }).content
        });
        handleNormalAttack(result, randomInt(10, 80), pressTeam, 
            pressTeam === 'home' ? home : away, 
            pressTeam === 'home' ? away : home, 
            tId, attPlayers, defPlayers);
    }
  }

  result.events.sort((a, b) => a.minute - b.minute);
  return result;
}

function handleNormalAttack(
    result: MatchResult, 
    minute: number, 
    controllingTeam: 'home' | 'away', 
    att: TeamRatings, 
    def: TeamRatings, 
    teamId: number, 
    players: Player[],
    defenders: Player[]
) {
    const sectorRoll = Math.random();
    let sector: 'Left' | 'Center' | 'Right' = sectorRoll < 0.33 ? 'Left' : sectorRoll < 0.66 ? 'Right' : 'Center';

    let attackPower = (att as any)[`attack${sector}`] || 1;
    const defensePower = (def as any)[`defense${sector}`] || 1;

    // --- INDIVIDUAL INFLUENCE ---
    // Select potential scorer weighted by position
    const starters = players.filter(p => p.isStarter);
    const fwds = starters.filter(p => p.position === 'FWD');
    const mids = starters.filter(p => p.position === 'MID');
    const defs = starters.filter(p => p.position === 'DEF');
    
    // Weights: FWD 50%, MID 40%, DEF 10%
    const roll = Math.random();
    let shooter: Player;
    if (roll < 0.5 && fwds.length > 0) shooter = getRandomElement(fwds);
    else if (roll < 0.9 && mids.length > 0) shooter = getRandomElement(mids);
    else if (defs.length > 0) shooter = getRandomElement(defs);
    else shooter = getRandomElement(starters.length > 0 ? starters : players);

    // Shooter Bonus/Penalty based on Shooting stat (Avg 50)
    // 50 -> 1.0. 90 -> 1.4. 10 -> 0.6.
    const shootingBonus = 0.5 + (shooter.stats.shooting / 100);
    attackPower *= shootingBonus;

    // GK Influence (if possible)
    const oppGK = defenders.find(p => p.position === 'GK' && p.isStarter);
    if (oppGK) {
        // Reflexes/Defense stats check
        // If GK is good, increase effective defense power
        const gkBonus = 0.8 + (oppGK.stats.defense / 250); // Defense stat is general. 
        // Example: Defense 50 -> 0.8 + 0.2 = 1.0 (Neutral)
        // Defense 90 -> 0.8 + 0.36 = 1.16 (Buff)
        // defensePower *= gkBonus; // Let's apply to denominator logic indirectly
        // Actually, let's keep it simple for now and rely on team defense rating which includes GK
    }

    // Formule ajustée : Cubique
    const scoringChance = Math.pow(attackPower, 3) / (Math.pow(attackPower, 3) + Math.pow(defensePower, 3));

    if (probability(scoringChance)) {
        if (controllingTeam === 'home') result.homeScore++;
        else result.awayScore++;

        result.events.push({
            minute, type: 'GOAL', teamId, scorerId: shooter.id, scorerName: shooter.lastName,
            description: getNarrative('match', 'goal', { player: shooter.lastName }).content
        });
    } else {
        if (scoringChance > 0.20 || probability(0.3)) {
            result.events.push({
                minute, type: 'MISS', teamId,
                description: getNarrative('match', 'miss', { player: shooter.lastName }).content
            });
        }
    }
}

function handleSetPiece(
    result: MatchResult, 
    minute: number, 
    controllingTeam: 'home' | 'away',
    att: TeamRatings, 
    def: TeamRatings, 
    teamId: number, 
    players: Player[]
) {
    // Rend les CPA plus difficiles
    const chance = Math.pow(att.setPieces, 2) / (Math.pow(att.setPieces, 2) + Math.pow(def.defenseCenter, 2));
    
    if (probability(chance)) {
        if (controllingTeam === 'home') result.homeScore++;
        else result.awayScore++;

        const taker = players.reduce((prev, curr) => (prev.stats.shooting > curr.stats.shooting) ? prev : curr);
        result.events.push({
            minute, type: 'GOAL', teamId, scorerId: taker.id, scorerName: taker.lastName,
            description: "But sur coup de pied arrêté magnifique !" 
        });
    } else {
        if (probability(0.5)) { 
            result.events.push({
                minute, type: 'SET_PIECE', teamId,
                description: "Coup franc dangereux mais repoussé par la défense."
            });
        }
    }
}

function handleSpecialEvent(
    result: MatchResult, 
    minute: number, 
    controllingTeam: 'home' | 'away',
    teamId: number, 
    players: Player[]
) {
    // Seuil augmenté et check condition pour la fatigue
    const speedster = players.find(p => p.stats.speed > 80 && p.condition > 50); 
    
    if (speedster && probability(0.15)) { // 15% (au lieu de 20%)
        result.events.push({
            minute, type: 'SPECIAL', teamId, scorerId: speedster.id, scorerName: speedster.lastName,
            description: `${speedster.lastName} prend tout le monde de vitesse ! (Événement Rapide)`
        });
        
        if(probability(0.35)) { // 35% de conversion
             if (controllingTeam === 'home') result.homeScore++;
             else result.awayScore++;

             result.events.push({
                minute, type: 'GOAL', teamId, scorerId: speedster.id, scorerName: speedster.lastName,
                description: "Et c'est au fond ! Quel raid solitaire !"
            });
        }
    }
}

function handleCounterAttack(
    result: MatchResult, 
    teamName: 'home' | 'away', 
    att: TeamRatings, 
    def: TeamRatings, 
    teamId: number, 
    players: Player[],
    defenders: Player[]
) {
    const caChance = Math.pow(att.tacticSkill, 2) / (Math.pow(att.tacticSkill, 2) + Math.pow(def.defenseCenter, 2));
    
    if (probability(caChance)) {
        const minute = randomInt(10, 85);
        result.events.push({
            minute, type: 'TRANSITION', teamId,
            description: "Contre-attaque fulgurante lancée !"
        });
        handleNormalAttack(result, minute, teamName, att, def, teamId, players, defenders);
    }
}
