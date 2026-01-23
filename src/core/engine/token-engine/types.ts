export type TokenType = 
  | 'PASS' | 'DRIBBLE' | 'SHOOT' | 'TACKLE' | 'INTERCEPT' | 'SAVE' | 'FATIGUE'
  | 'ERROR' | 'COMBO_PASS' | 'OFFSIDE' | 'FOUL' | 'CORNER' | 'SYSTEM' | 'NEUTRAL_POSSESSION';

export interface Token {
  id: string;
  type: TokenType;
  ownerId: number;   
  teamId: number;    
  quality: number;   
  duration: number;
  metadata?: any;
}

export interface GridPosition { x: number; y: number; }

export interface ZoneData {
    id: string; 
    baseTokens: Token[]; 
    logic: { defenseMultiplier: number; errorChance: number; };
}

export interface MatchLog {
    time: number;
    type: 'ACTION' | 'THINKING' | 'EVENT' | 'STAT';
    eventSubtype?: 'GOAL' | 'FOUL' | 'CARD' | 'CORNER' | 'SHOT';
    text: string;
    playerName?: string;
    teamId?: number;
    ballPosition?: GridPosition;
    bag?: { type: TokenType, teamId: number }[];
    drawnToken?: { type: TokenType, teamId: number }; // Nouveau: Jeton tiré
}

export interface TokenPlayerState {
    id: number;
    name: string;
    teamId: number;
    role: string;
    stats: {
        technical: number; 
        finishing: number;  
        defense: number;    
        physical: number;   
        mental: number;     
        goalkeeping: number; 
    };
    staffModifiers: any;
}

export interface MatchStats {
    possession: { [teamId: number]: number };
    passes: { [teamId: number]: { attempted: number; successful: number } };
    shots: { [teamId: number]: { total: number; onTarget: number; goals: number } };
    fouls: { [teamId: number]: number };
    corners: { [teamId: number]: number };
}

export type TacticType = '4-4-2' | '4-3-3' | '3-5-2' | '4-2-3-1' | '5-3-2';

export interface TacticTemplate {
    name: TacticType;
    roles: {
        [index: number]: {
            label: string;
            zones: GridPosition[];
        }
    };
}

export interface StaffModifiers {
    technicalBonus: number;
    tacticalBonus: number;
    disciplineBonus: number;
    staminaBonus: number;
}
