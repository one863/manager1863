// /src/core/engine/token-engine/special-events.ts
import type { Token } from "./types";

export type SpecialSituation = 'KICK_OFF' | 'KICK_OFF_RESTART' | 'GOAL_KICK' | 'CORNER' | 'PENALTY' | 'FREE_KICK' | 'CELEBRATION' | 'PLACEMENT';

/**
 * Détermine quelle équipe engage en première et deuxième mi-temps.
 */
export function drawKickoffTeam(): { first: 'home' | 'away', second: 'home' | 'away' } {
  return Math.random() > 0.5 
    ? { first: 'home', second: 'away' } 
    : { first: 'away', second: 'home' };
}

/**
 * Génère les données pour un coup d'envoi.
 */
export function getKickoffEvent(team: 'home' | 'away'): {
  text: string;
  ballPosition: { x: number; y: number };
  possessionTeam: 'home' | 'away';
} {
  // Placement au centre du terrain (2,2)
  return {
    text: `Coup d'envoi pour l'équipe ${team === 'home' ? 'domicile' : 'extérieure'}.`,
    ballPosition: { x: 2, y: 2 },
    possessionTeam: team
  };
}

/**
 * Génère une séquence de célébration après un but.
 */
export function getCelebrationEvent(scoringTeam: 'home' | 'away'): {
  text: string;
  ballPosition: { x: number; y: number };
  possessionTeam: 'home' | 'away';
  duration: number;
} {
  // La balle reste près du but marqué pour l'aspect visuel
  const pos = scoringTeam === 'home' ? { x: 5, y: 2 } : { x: 0, y: 2 };
  return {
    text: `BUT ! L'équipe ${scoringTeam === 'home' ? 'domicile' : 'extérieure'} exulte !`,
    ballPosition: pos,
    possessionTeam: scoringTeam,
    duration: 30
  };
}

/**
 * Replacement des joueurs avant la reprise.
 */
export function getPlacementEvent(nextTeam: 'home' | 'away'): {
  text: string;
  ballPosition: { x: number; y: number };
  possessionTeam: 'home' | 'away';
  duration: number;
} {
  return {
    text: 'Les deux équipes reprennent leurs positions.',
    ballPosition: { x: 2, y: 2 },
    possessionTeam: nextTeam,
    duration: 20
  };
}