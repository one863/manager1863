// Notes d'équipe (Échelle 1-20 pour simplifier le mapping Hattrick)
export interface TeamRatings {
  midfield: number;
  attackLeft: number;
  attackCenter: number;
  attackRight: number;
  defenseLeft: number;
  defenseCenter: number;
  defenseRight: number;
  setPieces: number; // Coups de pied arrêtés
  tacticSkill: number; // Niveau de la tactique (1-20)
  tacticType: 'NORMAL' | 'CA' | 'PRESSING' | 'AIM' | 'AOW'; 
}

export interface MatchEvent {
  minute: number;
  type: 'GOAL' | 'MISS' | 'SE' | 'CARD' | 'INJURY';
  teamId: number; // Qui a eu l'action
  scorerId?: number;
  scorerName?: string;
  description: string;
}

export interface MatchResult {
  homeScore: number;
  awayScore: number;
  homePossession: number; // En %
  events: MatchEvent[];
  stats: {
    homeChances: number;
    awayChances: number;
  }
}
