import type { Token } from "./types";

export type SpecialSituation = 'KICK_OFF' | 'KICK_OFF_RESTART' | 'GOAL_KICK' | 'CORNER' | 'PENALTY' | 'FREE_KICK' | 'CELEBRATION' | 'PLACEMENT';

// --- Tirage au sort initial ---
export function drawKickoffTeam(): { first: 'home' | 'away', second: 'home' | 'away' } {
  return Math.random() > 0.5 
    ? { first: 'home', second: 'away' } 
    : { first: 'away', second: 'home' };
}

// --- Coup d’envoi (1ère ou 2nde mi-temps) ---
export function getKickoffEvent(team: 'home' | 'away'): {
  bag: Token[];
  text: string;
  ballPosition: { x: number; y: number };
  possessionTeam: 'home' | 'away';
} {
  // Placement strict sur la ligne médiane
  const pos = team === 'home' ? { x: 2, y: 2 } : { x: 3, y: 2 };
  // Possession attribuée immédiatement
  console.log(`[DEBUG][getKickoffEvent] team: ${team} ballPosition: x=${pos.x}, y=${pos.y}`);
  const zone = team === 'home' ? '2,2' : '3,2';
  return {
    bag: [
      { id: 'ko1', type: 'PASS_SHORT', teamId: team === 'home' ? 1 : 2, ownerId: 0, zone },
      { id: 'ko2', type: 'PASS_LATERAL', teamId: team === 'home' ? 1 : 2, ownerId: 0, zone }
    ],
    text: `Coup d'envoi pour l'équipe ${team === 'home' ? 'domicile' : 'extérieure'}.`,
    ballPosition: pos,
    possessionTeam: team // Possession immédiate
  };
}

// --- Après un but : célébration ---
export function getCelebrationEvent(scoringTeam: 'home' | 'away'): {
  bag: Token[];
  text: string;
  ballPosition: { x: number; y: number };
  possessionTeam: 'home' | 'away';
  duration: number;
} {
  const pos = scoringTeam === 'home' ? { x: 0, y: 0 } : { x: 5, y: 4 };
  return {
    bag: [{ id: 'celebration', type: 'CELEBRATION', teamId: scoringTeam === 'home' ? 1 : 2, ownerId: 0 }],
    text: `BUT ! L'équipe ${scoringTeam} exulte !`,
    ballPosition: pos,
    possessionTeam: scoringTeam,
    duration: 30
  };
}

// --- Replacement des joueurs ---
export function getPlacementEvent(nextTeam: 'home' | 'away'): {
  bag: Token[];
  text: string;
  ballPosition: { x: number; y: number };
  possessionTeam: 'home' | 'away';
  duration: number;
} {
  const pos = nextTeam === 'home' ? { x: 2, y: 2 } : { x: 3, y: 2 };
  return {
    bag: [{ id: 'placement', type: 'PLACEMENT', teamId: nextTeam === 'home' ? 1 : 2, ownerId: 0 }],
    text: 'Les deux équipes reprennent leurs positions.',
    ballPosition: pos,
    possessionTeam: nextTeam,
    duration: 20
  };
}

export function getSpecialBag(situation: SpecialSituation, teamId: number): Token[] {
  const team = teamId === 1 ? 'home' : 'away';
  switch (situation) {
    case 'KICK_OFF':
    case 'KICK_OFF_RESTART':
      return getKickoffEvent(team).bag;
    default:
      return [];
  }
}
