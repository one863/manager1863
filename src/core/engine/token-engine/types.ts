export type TokenType = 
  | 'PASS_SHORT' | 'PASS_LONG' | 'PASS_BACK' | 'PASS_SWITCH' | 'DRIBBLE' | 'DRIBBLE_LOST' | 'COMBO_PASS' | 'CROSS' | 'THROUGH_BALL' | 'KEY_PASS' | 'CUT_BACK'
  | 'SHOOT_GOAL' | 'SHOOT_SAVED' | 'SHOOT_CORNER' | 'SHOOT_OFF_TARGET' | 'SHOOT_WOODWORK'
  | 'HEAD_PASS' | 'HEAD_SHOT' | 'REBOUND' | 'OWN_GOAL'
  | 'TACKLE' | 'INTERCEPT' | 'SAVE' | 'BLOCK' | 'CLEARANCE' | 'BALL_RECOVERY'
  | 'DUEL_WON' | 'DUEL_LOST' | 'PRESSING_SUCCESS'
  | 'PUNCH' | 'CLAIM' | 'SWEEPER_KEEPER'
  | 'FATIGUE' | 'ERROR' | 'OFFSIDE' | 'FOUL' | 'YELLOW_CARD' | 'RED_CARD' | 'SECOND_YELLOW_CARD' | 'INJURY' | 'STRETCHER'
  | 'CORNER_GOAL' | 'CORNER_CLEARED' | 'CORNER_SHORT' | 'CORNER_OVERCOOKED'
  | 'PENALTY_GOAL' | 'PENALTY_SAVED' | 'PENALTY_MISS'
  | 'GK_SHORT' | 'GK_LONG' | 'GK_BOULETTE'
  | 'THROW_IN_SAFE' | 'THROW_IN_LOST' | 'THROW_IN_LONG_BOX'
  | 'FREE_KICK_SHOT' | 'FREE_KICK_CROSS' | 'FREE_KICK_WALL'
  | 'VAR_CHECK' | 'STALEMATE' | 'ADDED_TIME'
  | 'NEUTRAL_POSSESSION' | 'SYSTEM';

export type MatchSituation = 'NORMAL' | 'CORNER' | 'PENALTY' | 'FREE_KICK' | 'GOAL_KICK' | 'THROW_IN' | 'KICK_OFF' | 'REBOUND_ZONE' | 'VAR_ZONE';

export interface Token {
  id: string;
  type: TokenType;
  ownerId: number;   
  teamId: number;    
  quality: number;   
  duration: number;
  metadata?: any;
}

export interface TokenExecutionResult {
    moveX: number;
    moveY: number;
    possessionChange: boolean;
    isGoal: boolean;
    isEvent: boolean;
    eventSubtype?: 'GOAL' | 'FOUL' | 'CARD' | 'CORNER' | 'SHOT' | 'INJURY' | 'PENALTY' | 'SAVE' | 'WOODWORK' | 'VAR';
    nextSituation?: MatchSituation;
    logMessage: string;
    customDuration?: number;
    stats?: { 
        xg?: number; 
        isPass?: boolean; 
        isSuccess?: boolean; 
        isDuel?: boolean; 
        isInterception?: boolean; 
        isChanceCreated?: boolean; 
        isAssist?: boolean;
    };
}

export interface GridPosition { x: number; y: number; }

export interface MatchLog {
    time: number;
    type: 'ACTION' | 'THINKING' | 'EVENT' | 'STAT' | 'START';
    eventSubtype?: 'GOAL' | 'FOUL' | 'CARD' | 'CORNER' | 'SHOT' | 'INJURY' | 'PENALTY' | 'SAVE' | 'WOODWORK' | 'VAR';
    text: string;
    playerName?: string;
    teamId?: number;
    ballPosition?: GridPosition;
    bag?: { type: TokenType, teamId: number }[];
    drawnToken?: { type: TokenType, teamId: number };
    statImpact?: any;
    zoneInfluences?: Record<string, { homeAtk: number, homeDef: number, awayAtk: number, awayDef: number }>;
}
