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

  const totalMidfield = (home.midfield || 1) + (away.midfield || 1);
  result.homePossession = Math.round((home.midfield / totalMidfield) * 100);

  // --- NOUVEAU SYSTÈME DE CYCLES (15 Cycles) ---
  const CYCLES = 15;
  const cycleDuration = 90 / CYCLES;
  
  for (let cycle = 0; cycle < CYCLES; cycle++) {
    const minute = Math.floor(cycle * cycleDuration) + randomInt(1, 4);
    
    // --- Phase 0 : Bataille Territoriale ---
    const homeControlChance = home.midfield / (home.midfield + away.midfield);
    const controllingTeam = Math.random() < homeControlChance ? 'home' : 'away';
    
    const attackingRatings = controllingTeam === 'home' ? home : away;
    const defendingRatings = controllingTeam === 'home' ? away : home;
    const attackingId = controllingTeam === 'home' ? homeTeamId : awayTeamId;
    const attackingPlayers = controllingTeam === 'home' ? homePlayers : awayPlayers;
    
    if (controllingTeam === 'home') result.stats.homeChances++;
    else result.stats.awayChances++;

    // --- Phase 1 : Type d'Action ---
    const actionRoll = Math.random();
    
    // 5% de chance d'un événement CPA (Réduit de 10% pour équilibrer le score)
    if (actionRoll < 0.05) {
      handleSetPiece(result, minute, controllingTeam, attackingRatings, defendingRatings, attackingId, attackingPlayers);
      continue;
    }
    
    // 5% de chance d'un Événement Spécial (SE) (Réduit de 10% pour équilibrer le score)
    if (actionRoll < 0.10) {
      handleSpecialEvent(result, minute, controllingTeam, attackingId, attackingPlayers);
      continue;
    }

    // 90% Action Normale (Augmenté pour être la norme)
    handleNormalAttack(result, minute, controllingTeam, attackingRatings, defendingRatings, attackingId, attackingPlayers);
  }

  // --- Mécanique de Contre-Attaque (Plafond Dynamique) ---
  if (result.homePossession > 60 && away.tacticType === 'CA') {
    handleCounterAttack(result, 'away', away, home, awayTeamId, awayPlayers);
  } else if (result.homePossession < 40 && home.tacticType === 'CA') {
    handleCounterAttack(result, 'home', home, away, homeTeamId, homePlayers);
  }

  // --- Transitions Offensives (Réduite à 5% au lieu de 15% pour éviter les scores fleuves) ---
  if (probability(0.05)) {
    const pressTeam = home.tacticType === 'PRESSING' ? 'home' : (away.tacticType === 'PRESSING' ? 'away' : null);
    if (pressTeam) {
        const tId = pressTeam === 'home' ? homeTeamId : awayTeamId;
        const players = pressTeam === 'home' ? homePlayers : awayPlayers;
        result.events.push({
            minute: randomInt(10, 80),
            type: 'TRANSITION',
            teamId: tId,
            description: getNarrative('match', 'transition', { team: pressTeam === 'home' ? 'Home' : 'Away' }).content
        });
        handleNormalAttack(result, randomInt(10, 80), pressTeam, 
            pressTeam === 'home' ? home : away, 
            pressTeam === 'home' ? away : home, 
            tId, players);
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
    players: Player[]
) {
    const sectorRoll = Math.random();
    let sector: 'Left' | 'Center' | 'Right' = sectorRoll < 0.33 ? 'Left' : sectorRoll < 0.66 ? 'Right' : 'Center';

    const attackPower = (att as any)[`attack${sector}`] || 1;
    const defensePower = (def as any)[`defense${sector}`] || 1;

    // Formule ajustée : Cubique au lieu de Quadratique pour rendre les buts plus durs si la défense est présente
    const scoringChance = Math.pow(attackPower, 3) / (Math.pow(attackPower, 3) + Math.pow(defensePower, 3));

    if (probability(scoringChance)) {
        if (controllingTeam === 'home') result.homeScore++;
        else result.awayScore++;

        const scorers = players.filter(p => p.position === 'FWD' || p.position === 'MID');
        const scorer = getRandomElement(scorers.length > 0 ? scorers : players);

        result.events.push({
            minute, type: 'GOAL', teamId, scorerId: scorer.id, scorerName: scorer.lastName,
            description: getNarrative('match', 'goal', { player: scorer.lastName }).content
        });
    } else {
        // On réduit le nombre de logs "MISS" inutiles pour ne pas flooder le rapport,
        // on ne logue un MISS que si c'était une "vraie" occasion (chance > 20%)
        if (scoringChance > 0.20 || probability(0.3)) {
            const p = getRandomElement(players);
            result.events.push({
                minute, type: 'MISS', teamId,
                description: getNarrative('match', 'miss', { player: p.lastName }).content
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
        if (probability(0.5)) { // Ne pas tout logger
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
    const speedster = players.find(p => p.stats.speed > 80); // Seuil augmenté à 80
    
    if (speedster && probability(0.2)) { // Probabilité d'activation réduite
        result.events.push({
            minute, type: 'SPECIAL', teamId, scorerId: speedster.id, scorerName: speedster.lastName,
            description: `${speedster.lastName} prend tout le monde de vitesse ! (Événement Rapide)`
        });
        
        if(probability(0.4)) { // Chance de conversion réduite
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
    players: Player[]
) {
    const caChance = Math.pow(att.tacticSkill, 2) / (Math.pow(att.tacticSkill, 2) + Math.pow(def.defenseCenter, 2));
    
    if (probability(caChance)) {
        const minute = randomInt(10, 85);
        result.events.push({
            minute, type: 'TRANSITION', teamId,
            description: "Contre-attaque fulgurante lancée !"
        });
        handleNormalAttack(result, minute, teamName, att, def, teamId, players);
    }
}
