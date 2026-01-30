
// Type minimal pour un jeton d'action
export interface Token {
  id: string;
  type: string;
  ownerId: number; // ID du joueur ou 0 pour collectif
  teamId: number;
  // Optionnel : nom du joueur associé à l'action (pour les buts, etc.)
  playerName?: string;
  // Optionnel : identifiant de la zone (ex: '2,2')
  zone?: string;
}

// Interface complète pour un log d'événement de match, utilisée pour l'export Worker/UI
// Mapping moteur → Worker :
// - time : minute de l'événement (direct du moteur)
// - type : 'ACTION' ou 'GOAL' selon l'action simulée
// - text : description de l'action (générée par le moteur)
// - teamId : équipe à l'origine de l'action (id string|number, direct du moteur)
// - ballPosition : position {x, y} de la balle après l'action (direct du moteur)
// - possessionTeamId : équipe en possession après l'action (id string|number, direct du moteur)
// - bag : sac de jetons pour la zone courante (copie profonde, voir worker)
// - drawnToken : jeton tiré pour cette action (copie profonde, voir worker)
export interface MatchLog {
    time: number;
    type: 'ACTION' | 'GOAL';
    text: string;
    teamId: string | number;
    ballPosition: { x: number; y: number };
    // Optional start position for special events (kickoff/placement)
    startBallPosition?: { x: number; y: number };
    // Optionnel : situation spéciale (KICK_OFF, KICK_OFF_RESTART, CELEBRATION, etc.)
    situation?: string;
    possessionTeamId: string | number;
    bag: Token[];
    drawnToken: Token;
    // Optionnel : événement de match structuré (pour les buts, etc.)
    matchEvent?: {
      type: string;
      scorerId?: string | number;
      scorerName?: string;
      assistId?: string | number;
      assistName?: string;
      [key: string]: any;
    };
}
