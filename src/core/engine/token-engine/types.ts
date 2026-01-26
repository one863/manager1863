// Définition pour la configuration des zones (utilisé dans ZONES_CONFIG)
export interface ZoneDefinition {
  allowedRoles: string[];
  baseTokens: Partial<Token>[];
  defenseMultiplier?: number;
  errorChance?: number;
}

// Pour usage runtime (zone-manager)
export interface ZoneData {
  id: string;
  baseTokens: Token[];
  logic: {
    defenseMultiplier: number;
    errorChance: number;
  };
}

/**
 * Statistiques complètes d'un joueur (échelle 1-20)
 * 
 * TECHNIQUE (attaque)
 * - finishing: Précision des tirs → nombre de SHOOT_GOAL
 * - passing: Qualité des passes → nombre de PASS_*
 * - dribbling: Capacité à éliminer → nombre de DRIBBLE
 * - crossing: Qualité des centres → nombre de CROSS
 * - vision: Passes décisives → nombre de THROUGH_BALL
 * - longShots: Tirs de loin → SHOOT en dehors de la surface
 * - heading: Jeu de tête → HEAD_SHOT, HEAD_PASS
 * 
 * DÉFENSE
 * - tackling: Qualité des tacles → nombre de TACKLE
 * - marking: Marquage → nombre de BLOCK
 * - positioning: Placement → nombre de INTERCEPT
 * - heading: Jeu de tête défensif → CLEARANCE
 * 
 * PHYSIQUE
 * - pace: Vitesse → influence sur les duels
 * - strength: Puissance → résistance aux tacles
 * - endurance: Endurance → résistance à la fatigue
 * - jumping: Détente → jeu aérien
 * 
 * MENTAL
 * - composure: Sang-froid → réduit les ratés sous pression
 * - concentration: Concentration → réduit les erreurs en fin de match
 * - aggression: Agressivité → plus de tacles, risque de fautes
 * - workRate: Volume de jeu → présence dans plus de zones
 * 
 * GARDIEN (si GK)
 * - reflexes: Réflexes → arrêts
 * - handling: Prise de balle → CLAIM vs PUNCH
 * - kicking: Relance au pied → GK_LONG
 * - oneOnOnes: Face à face → arrêts en 1v1
 */
export interface PlayerStats {
  // Technique
  finishing: number;
  passing: number;
  dribbling: number;
  crossing: number;
  vision: number;
  longShots: number;
  heading: number;
  
  // Défense
  tackling: number;
  marking: number;
  positioning: number;
  
  // Physique
  pace: number;
  strength: number;
  endurance: number;
  jumping: number;
  
  // Mental
  composure: number;      // Sang-froid sous pression
  concentration: number;  // Évite les erreurs en fin de match
  aggression: number;     // Tacles agressifs, risque de fautes
  workRate: number;       // Volume de jeu
  
  // Gardien (optionnel)
  reflexes?: number;
  handling?: number;
  kicking?: number;
  oneOnOnes?: number;
  
  // Legacy (pour compatibilité)
  technical?: number;
  defense?: number;
  
  [key: string]: number | undefined;
}
export type TokenType = 
  | 'PASS_SHORT' | 'PASS_LONG' | 'PASS_BACK' | 'PASS_SWITCH' | 'DRIBBLE' | 'COMBO_PASS' | 'CROSS' | 'THROUGH_BALL' | 'CUT_BACK'
  | 'SHOOT_GOAL' | 'SHOOT_SAVED' | 'SHOOT_CORNER' | 'SHOOT_OFF_TARGET' | 'SHOOT_WOODWORK' | 'SHOOT_SAVED_CORNER' | 'WOODWORK_OUT'
  | 'HEAD_PASS' | 'HEAD_SHOT' | 'REBOUND' | 'OWN_GOAL'
  | 'TACKLE' | 'INTERCEPT' | 'SAVE' | 'BLOCK' | 'CLEARANCE' | 'BALL_RECOVERY'
  | 'DUEL_WON' | 'DUEL_LOST' | 'PRESSING_SUCCESS'
  | 'PUNCH' | 'CLAIM' | 'SWEEPER_KEEPER' | 'GK_POSSESSION'
  | 'FATIGUE' | 'ERROR' | 'OFFSIDE' | 'FOUL' | 'FOUL_PENALTY' | 'CARD' | 'FREE_KICK' | 'YELLOW_CARD' | 'RED_CARD' | 'SECOND_YELLOW_CARD' | 'INJURY' | 'STRETCHER'
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
  isGoal: boolean;
  isEvent: boolean;
  eventSubtype?: 'GOAL' | 'FOUL' | 'CARD' | 'CORNER' | 'SHOT' | 'INJURY' | 'PENALTY' | 'SAVE' | 'WOODWORK' | 'VAR';
  nextSituation?: MatchSituation;
  logMessage: string;
  customDuration?: number;
  /** Si true, la possession passe à l'adversaire après cette action */
  turnover?: boolean;
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

export interface TokenPlayerState {
  id: string;
  teamId: number;
  position: string;
  stats: PlayerStats;
  stamina: number;
  form: number;
  fatigue: number;
  injured: boolean;
  suspended: boolean;
}

export interface StaffModifiers {
  technicalBonus: number;
  tacticalBonus: number;
  disciplineBonus: number;
  staminaBonus: number;
}

export interface MatchStats {
  possession: Record<string, number>;
  shots: Record<string, any>;
  shotsOnTarget?: Record<string, number>;
  corners: Record<string, number>;
  fouls: Record<string, number>;
  cards: Record<string, number>;
  passes: Record<string, any>;
  xg: Record<string, number>;
  duels?: Record<string, any>;
  interceptions?: Record<string, number>;
  woodwork?: Record<string, number>;
  possessionPercent?: Record<string, number>;
}

export type TacticType = 'OFFENSIVE' | 'BALANCED' | 'DEFENSIVE' | 'COUNTER_ATTACK' | 'POSSESSION';

export interface TacticTemplate {
  id: string;
  name: string;
  type: TacticType;
  formation: string;
  instructions: any;
  roles?: any;
}

export interface MatchLog {
  time: number;
  type: 'ACTION' | 'THINKING' | 'EVENT' | 'STAT' | 'START';
  eventSubtype?: 'GOAL' | 'FOUL' | 'CARD' | 'CORNER' | 'SHOT' | 'INJURY' | 'PENALTY' | 'SAVE' | 'WOODWORK' | 'VAR';
  text: string;
  playerName?: string;
  teamId?: number;
  possessionTeamId?: number; // Ajout : équipe réellement en possession après l'action
  ballPosition?: GridPosition;
  bag?: { type: TokenType, teamId: number }[];
  drawnToken?: { type: TokenType, teamId: number };
  statImpact?: any;
  zoneInfluences?: Record<string, { homeAtk: number, homeDef: number, awayAtk: number, awayDef: number }>;
}
