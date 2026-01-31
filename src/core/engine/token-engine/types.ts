// /src/core/engine/token-engine/types.ts

export type BallPosition = { x: number; y: number };

/**
 * Type riche pour un jeton d'action (Token).
 * Un jeton est pioché dans le "sac" d'une zone et contient déjà les acteurs potentiels.
 */
export interface Token {
  id: string;
  type: string;
  teamId: number;
  
  // Acteurs de l'action
  primaryPlayerId: number;    // Le joueur principal (ex: celui qui tire, tacle ou passe)
  playerName: string;         // Nom du joueur principal (pour affichage rapide sans jointure DB)
  secondaryPlayerId?: number; // Optionnel : partenaire (passeur) ou adversaire (victime de faute)
  secondaryPlayerName?: string; 

  // Logique narrative
  narrativeTemplate: string;  // Exemple : "{p1} déclenche une frappe puissante !"
  
  // Méta-données moteur
  statCategory?: string;      // Pour catégoriser les stats (ex: 'shooting', 'passing')
  zone?: string;              // Identifiant de la zone d'origine (ex: '2,2')
}

/**
 * Interface complète pour un log d'événement de match.
 * Utilisée pour la communication entre le Worker (moteur) et l'UI (MatchLive).
 */
export interface MatchLog {
  time: number;               // Temps en secondes depuis le début du match
  type: 'ACTION' | 'GOAL' | 'KICK_OFF' | 'CELEBRATION';    // Type d'événement majeur ou spécial
  text: string;               // Texte final après remplacement des placeholders
  teamId: number;             // Équipe à l'origine de l'action

  ballPosition: BallPosition; // Position {x, y} de la balle APRÈS l'action
  startBallPosition?: BallPosition; // Position AVANT l'action (ex: pour l'engagement)

  possessionTeamId: number;   // Équipe qui a la balle après l'action

  // Données de simulation (Debug/UI)
  bag: Token[];               // État du sac de jetons au moment du tirage
  drawnToken?: Token;         // Le jeton qui a été effectivement tiré (optionnel pour les événements spéciaux)
  logIndex?: number;          // Index du log dans la séquence du match
  zone?: string;              // Zone où l'action a été initiée (ex: '2,2')

  // Données pour la Persistance et les Stats
  situation?: string;         // Contexte (KICK_OFF, CELEBRATION, etc.)
  statsUpdate?: Record<string, number>; // Incréments de stats (ex: { shots: 1, passes: 1 })

  // Événement structuré pour la DB (MatchEvent)
  matchEvent?: {
    type: string;
    playerId: number;
    playerName: string;
    secondaryPlayerId?: number;
    secondaryPlayerName?: string;
    xg?: number;
    [key: string]: any;
  };
}