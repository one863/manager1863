/**
 * Génère le sac de jetons pour un coup d'envoi (1ère, 2e mi-temps ou après but).
 * @param team 'home' ou 'away' (équipe qui engage)
 * @param homeTeamId id équipe domicile
 * @param awayTeamId id équipe extérieure
 * @param getPlayerForZone fonction pour récupérer un joueur positionné sur la zone d'engagement
 * @returns Token[]
 */
export function getKickoffBag(
  team: 'home' | 'away',
  homeTeamId: number,
  awayTeamId: number,
  getPlayerForZone: (team: 'home' | 'away', x: number, y: number) => { id: number; lastName: string }
): Token[] {
  const kickoffX = team === 'home' ? 2 : 3;
  return ['PASS_SHORT', 'PASS_LATERAL'].map(type => {
    const p = getPlayerForZone(team, kickoffX, 2);
    return {
      id: Math.random().toString(36).slice(2), // UUID simplifié, à remplacer si besoin
      type,
      teamId: team === 'home' ? homeTeamId : awayTeamId,
      primaryPlayerId: p.id,
      playerName: p.lastName,
      narrativeTemplate: type === 'PASS_SHORT'
        ? '{p1} joue court pour construire.'
        : '{p1} écarte le jeu sur l\'aile.',
      zone: `${kickoffX},2`
    };
  });
}
// /src/core/engine/token-engine/special-events.ts
import type { Token } from "./types";

export type SpecialSituation = 'KICK_OFF' | 'KICK_OFF_RESTART' | 'GOAL_KICK' | 'CORNER' | 'PENALTY' | 'FREE_KICK';

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