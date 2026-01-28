/**
 * REPERE SPATIAL
 * x: 0 (But Home) à 5 (But Away)
 * y: 0 (Aile Gauche) à 4 (Aile Droite)
 */
export interface GridPosition { 
  x: number; 
  y: number; 
}

// ==========================================
// 1. CONFIGURATION DES ZONES ET TACTIQUES
// ==========================================

export interface ZoneDefinition {
  allowedRoles: string[];
  baseTokens: Partial<Token>[];
  errorChance?: number;
}

export type TacticType = 'OFFENSIVE' | 'BALANCED' | 'DEFENSIVE' | 'COUNTER_ATTACK' | 'POSSESSION';

export interface TacticTemplate {
  id: string;
  name: string;
  type: TacticType;
  formation: string; // ex: '4-4-2'
  instructions: any;
  roles?: Record<string, string>; // Mapping rôle -> poste théorique
}

// ==========================================
// 2. LE JOUEUR (STATS ET ÉTAT)
// ==========================================

/**
 * Statistiques sur une échelle de 1 à 20
 */
export interface PlayerStats {
  // Technique (Offense)
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
  concentration: number;  // Évite les erreurs
  aggression: number;     // Risque de fautes
  workRate: number;       // Volume de jeu
  
  // Gardien
  reflexes?: number;
  handling?: number;
  kicking?: number;
  oneOnOnes?: number;

  // Compatibilité
  technical?: number;
  defense?: number;

  [key: string]: number | undefined;
}

export interface TokenPlayerState {
  id: number;
  teamId: number;
  role: string;          // Rôle tactique (ex: ST, DC, MCL)
  stats: PlayerStats;
  fatigue: number;       // 0 à 100
  confidence: number;    // 0 à 100
  injured: boolean;
  suspended: boolean;
}

// ==========================================
// 3. LOGIQUE DES JETONS (ENGINE)
// ==========================================

export interface Token {
  id: string;
  type: string;
  ownerId: number;       // ID du joueur qui a généré le jeton
  teamId: number;
  duration: number;      // Temps consommé par l'action (en secondes)
  role?: string;         // Rôle associé au jeton
  position?: string;     // Affichage (ex: "Buteur")
  metadata?: any;        // Pour stocker si c'est un jeton TIRED, ELITE, etc.
}

export type MatchSituation = 
  | 'NORMAL' 
  | 'KICK_OFF' 
  | 'KICK_OFF_RESTART' 
  | 'CORNER' 
  | 'PENALTY' 
  | 'GOAL_KICK' 
  | 'FREE_KICK' 
  | 'GOAL_HOME' 
  | 'GOAL_AWAY';

export interface TokenExecutionResult {
  moveX: number;
  moveY: number;
  isGoal: boolean;
  isEvent: boolean;
  eventSubtype?: 'GOAL' | 'FOUL' | 'CARD' | 'CORNER' | 'SHOT' | 'SAVE' | 'WOODWORK' | 'BLOCK';
  nextSituation?: MatchSituation;
  logMessage: string;
  customDuration?: number;
  turnover?: boolean;     // Si true, l'autre équipe récupère le ballon
  stats?: { 
    xg?: number; 
    isPass?: boolean; 
    isSuccess?: boolean; 
    isChanceCreated?: boolean; 
  };
  overrideBallPosition?: GridPosition; // Pour forcer la balle (ex: penalty, centre)
}

// ==========================================
// 4. LOGS ET STATISTIQUES DE MATCH
// ==========================================

export interface MatchLog {
  time: number;           // Temps en secondes
  type: 'ACTION' | 'EVENT';
  text: string;
  teamId: number;         // Équipe qui fait l'action
  possessionTeamId: number;
  ballPosition: GridPosition;
  playerName?: string;    // Nom du joueur pour affichage direct
  eventSubtype?: string;
  bag?: Partial<Token>[]; // État du sac avant tirage
  drawnToken?: Partial<Token>; // Jeton pioché
}

export interface MatchStats {
  possession: Record<number, number>; // teamId -> secondes
  shots: Record<number, number>;
  shotsOnTarget: Record<number, number>;
  xg: Record<number, number>;
  corners: Record<number, number>;
  fouls: Record<number, number>;
  cards: Record<number, { yellow: number, red: number }>;
}