export type TokenType = 
  | 'PASS' 
  | 'DRIBBLE' 
  | 'SHOOT' 
  | 'TACKLE' 
  | 'INTERCEPT' 
  | 'SAVE' 
  | 'FATIGUE'
  | 'ERROR';

export interface Token {
  id: string;
  type: TokenType;
  ownerId: number;
  teamId: number;
  quality: number;     // 1-100
  duration: number;    // Temps consommé en secondes
}

export interface GridPosition {
  x: number; // 0 à 5 (Sens du terrain)
  y: number; // 0 à 4 (Largeur)
}

export interface TokenPlayerState {
    id: number;
    teamId: number;
    position: GridPosition;
    fatigue: number;
    stats: {
        passing: number;
        shooting: number;
        tackling: number;
        dribbling: number;
        positioning: number;
        stamina: number;
        reflexes?: number; // Pour les gardiens
    };
    role: string;
}
