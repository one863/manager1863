import { MatchSituation, TokenType } from "../types";

/**
 * Configuration des situations spéciales de match.
 * Chaque situation a ses propres règles de durée, possession et position de balle.
 */

export interface SpecialSituationConfig {
  /** Durée de base de la situation (en secondes) */
  baseDuration: number;
  /** Position de la balle après la situation */
  ballPosition?: { x: number; y: number } | 'CURRENT' | 'CENTER' | 'PENALTY_SPOT';
  /** Qui a la possession après la situation? */
  possession: 'ATTACKING_TEAM' | 'DEFENDING_TEAM' | 'CONCEDING_TEAM' | 'FOULED_TEAM' | 'CURRENT';
  /** Situation suivante */
  nextSituation: MatchSituation;
  /** Peut-on marquer directement? */
  canScoreDirectly: boolean;
  /** Message narratif */
  narrative: string;
}

/**
 * Séquences spéciales après certains événements
 */
export interface EventSequence {
  /** Phases de la séquence avec leur durée */
  phases: {
    duration: number;
    narrative: string;
    eventSubtype?: 'GOAL' | 'FOUL' | 'CARD' | 'INJURY' | 'VAR';
  }[];
  /** Position finale de la balle */
  finalBallPosition: { x: number; y: number } | 'CENTER';
  /** Situation finale */
  finalSituation: MatchSituation;
  /** Qui a la possession à la fin? */
  finalPossession: 'SCORING_TEAM' | 'CONCEDING_TEAM' | 'FOULED_TEAM' | 'FOULING_TEAM' | 'INJURED_TEAM' | 'OPPONENT_TEAM' | 'CURRENT';
}

// ============================================
// COUPS D'ENVOI
// ============================================
export const KICK_OFF_CONFIG: SpecialSituationConfig = {
  baseDuration: 5,
  ballPosition: 'CENTER',
  possession: 'CURRENT',
  nextSituation: 'NORMAL',
  canScoreDirectly: false,
  narrative: "L'arbitre donne le coup d'envoi."
};

// ============================================
// SÉQUENCE APRÈS UN BUT
// ============================================
export const GOAL_SEQUENCE: EventSequence = {
  phases: [
    { duration: 30, narrative: "Célébration du but !", eventSubtype: 'GOAL' },
    { duration: 30, narrative: "Les joueurs regagnent leurs positions pour la remise en jeu." }
  ],
  finalBallPosition: 'CENTER',
  finalSituation: 'KICK_OFF',
  finalPossession: 'CONCEDING_TEAM'
};

// ============================================
// COUPS DE PIED ARRÊTÉS
// ============================================
export const SET_PIECES_CONFIG: Record<MatchSituation, SpecialSituationConfig> = {
  'CORNER': {
    baseDuration: 8,
    ballPosition: 'CURRENT', // Coin du terrain
    possession: 'ATTACKING_TEAM',
    nextSituation: 'NORMAL',
    canScoreDirectly: true,
    narrative: "Corner pour {team}."
  },
  'PENALTY': {
    baseDuration: 15,
    ballPosition: 'PENALTY_SPOT',
    possession: 'FOULED_TEAM',
    nextSituation: 'NORMAL',
    canScoreDirectly: true,
    narrative: "PENALTY ! L'arbitre désigne le point de réparation !"
  },
  'FREE_KICK': {
    baseDuration: 10,
    ballPosition: 'CURRENT',
    possession: 'FOULED_TEAM',
    nextSituation: 'NORMAL',
    canScoreDirectly: true, // Si proche du but
    narrative: "Coup franc pour {team}."
  },
  'THROW_IN': {
    baseDuration: 5,
    ballPosition: 'CURRENT',
    possession: 'ATTACKING_TEAM', // L'équipe adverse de celle qui a mis en touche
    nextSituation: 'NORMAL',
    canScoreDirectly: false,
    narrative: "Touche pour {team}."
  },
  'GOAL_KICK': {
    baseDuration: 12,
    ballPosition: { x: 0, y: 2 }, // Sera ajusté selon l'équipe
    possession: 'DEFENDING_TEAM',
    nextSituation: 'NORMAL',
    canScoreDirectly: false,
    narrative: "Six mètres pour {team}."
  },
  'KICK_OFF': KICK_OFF_CONFIG,
  'NORMAL': {
    baseDuration: 0,
    ballPosition: 'CURRENT',
    possession: 'CURRENT',
    nextSituation: 'NORMAL',
    canScoreDirectly: true,
    narrative: ""
  },
  'REBOUND_ZONE': {
    baseDuration: 3,
    ballPosition: 'CURRENT',
    possession: 'CURRENT', // À déterminer par le prochain jeton
    nextSituation: 'NORMAL',
    canScoreDirectly: true,
    narrative: "Le ballon traîne dans la surface !"
  },
  'VAR_ZONE': {
    baseDuration: 45,
    ballPosition: 'CURRENT',
    possession: 'CURRENT',
    nextSituation: 'NORMAL',
    canScoreDirectly: false,
    narrative: "Vérification VAR en cours..."
  }
};

// ============================================
// SÉQUENCES BLESSURES
// ============================================
export const INJURY_SEQUENCES: Record<'MINOR' | 'SERIOUS' | 'STRETCHER', EventSequence> = {
  'MINOR': {
    phases: [
      { duration: 20, narrative: "Un joueur reste au sol...", eventSubtype: 'INJURY' },
      { duration: 10, narrative: "Le joueur se relève, il peut reprendre." }
    ],
    finalBallPosition: 'CENTER',
    finalSituation: 'NORMAL',
    finalPossession: 'INJURED_TEAM'
  },
  'SERIOUS': {
    phases: [
      { duration: 30, narrative: "Un joueur est touché ! L'arbitre arrête le jeu.", eventSubtype: 'INJURY' },
      { duration: 45, narrative: "Les soigneurs entrent sur le terrain." },
      { duration: 30, narrative: "Le joueur se relève avec difficulté, il semble pouvoir continuer." }
    ],
    finalBallPosition: 'CENTER',
    finalSituation: 'NORMAL',
    finalPossession: 'INJURED_TEAM'
  },
  'STRETCHER': {
    phases: [
      { duration: 30, narrative: "Un joueur est à terre ! Cela semble sérieux.", eventSubtype: 'INJURY' },
      { duration: 60, narrative: "La civière entre sur le terrain." },
      { duration: 45, narrative: "Le joueur est évacué sous les applaudissements du public." },
      { duration: 30, narrative: "Remplacement forcé, le jeu va reprendre." }
    ],
    finalBallPosition: 'CENTER',
    finalSituation: 'NORMAL',
    finalPossession: 'INJURED_TEAM'
  }
};

// ============================================
// SÉQUENCES CARTONS
// ============================================
export const CARD_SEQUENCES: Record<'YELLOW' | 'RED' | 'SECOND_YELLOW', EventSequence> = {
  'YELLOW': {
    phases: [
      { duration: 15, narrative: "L'arbitre sort le carton jaune !", eventSubtype: 'CARD' }
    ],
    finalBallPosition: 'CENTER',
    finalSituation: 'FREE_KICK',
    finalPossession: 'FOULED_TEAM'
  },
  'RED': {
    phases: [
      { duration: 20, narrative: "CARTON ROUGE ! L'arbitre est inflexible !", eventSubtype: 'CARD' },
      { duration: 15, narrative: "Le joueur quitte le terrain, son équipe jouera à 10." }
    ],
    finalBallPosition: 'CENTER',
    finalSituation: 'FREE_KICK',
    finalPossession: 'FOULED_TEAM'
  },
  'SECOND_YELLOW': {
    phases: [
      { duration: 15, narrative: "Deuxième carton jaune !", eventSubtype: 'CARD' },
      { duration: 20, narrative: "Le rouge est sorti ! Expulsion pour cumul de cartons !", eventSubtype: 'CARD' },
      { duration: 15, narrative: "Le joueur quitte le terrain, désabusé." }
    ],
    finalBallPosition: 'CENTER',
    finalSituation: 'FREE_KICK',
    finalPossession: 'FOULED_TEAM'
  }
};

// ============================================
// SÉQUENCE VAR
// ============================================
export const VAR_SEQUENCE: EventSequence = {
  phases: [
    { duration: 15, narrative: "L'arbitre porte la main à son oreillette...", eventSubtype: 'VAR' },
    { duration: 45, narrative: "Vérification VAR en cours. L'attente est insoutenable !", eventSubtype: 'VAR' },
    { duration: 15, narrative: "L'arbitre consulte l'écran sur le bord du terrain.", eventSubtype: 'VAR' }
  ],
  finalBallPosition: 'CENTER',
  finalSituation: 'NORMAL', // Sera remplacé par la décision
  finalPossession: 'CURRENT'
};

// ============================================
// DURÉES ADDITIONNELLES SELON LE CONTEXTE
// ============================================
export const ADDITIONAL_TIMES = {
  /** Temps supplémentaire pour les remplacements */
  SUBSTITUTION: 30,
  /** Temps pour les soins sur le terrain */
  TREATMENT: 25,
  /** Temps perdu pour simulation */
  TIME_WASTING: 10,
  /** Célébration excessive */
  EXCESSIVE_CELEBRATION: 15,
  /** Discussion avec l'arbitre */
  REFEREE_DISCUSSION: 20
};
