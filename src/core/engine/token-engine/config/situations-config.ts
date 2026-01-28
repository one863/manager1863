import { MatchSituation } from "../types";

/**
 * Configuration des situations spéciales de match.
 */
export interface SpecialSituationConfig {
  baseDuration: number;
  ballPosition?: { x: number; y: number } | 'CURRENT' | 'CENTER' | 'PENALTY_SPOT';
  possession: 'ATTACKING_TEAM' | 'DEFENDING_TEAM' | 'CONCEDING_TEAM' | 'FOULED_TEAM' | 'CURRENT';
  nextSituation: MatchSituation;
  canScoreDirectly: boolean;
  narrative: string;
}

export interface EventSequence {
  phases: {
    duration: number;
    narrative: string;
    eventSubtype?: 'GOAL' | 'FOUL' | 'CARD' | 'INJURY' | 'VAR';
  }[];
  finalBallPosition: { x: number; y: number } | 'CENTER' | 'CURRENT';
  finalSituation: MatchSituation;
  finalPossession: 'SCORING_TEAM' | 'CONCEDING_TEAM' | 'FOULED_TEAM' | 'FOULING_TEAM' | 'INJURED_TEAM' | 'OPPONENT_TEAM' | 'CURRENT';
}

// ============================================
// SÉQUENCE APRÈS UN BUT (Inspiré de ta logique handlePendingGoal)
// ============================================
export const GOAL_SEQUENCE: EventSequence = {
  phases: [
    { duration: 30, narrative: "BUT !!! La foule exulte pendant que {playerName} célèbre !", eventSubtype: 'GOAL' },
    { duration: 20, narrative: "Le ralenti confirme la précision de la frappe." },
    { duration: 10, narrative: "Les joueurs se replacent pour le coup d'envoi." }
  ],
  finalBallPosition: 'CENTER',
  finalSituation: 'KICK_OFF_RESTART',
  finalPossession: 'CONCEDING_TEAM'
};

// ============================================
// COUPS DE PIED ARRÊTÉS & ÉTATS
// ============================================
export const SET_PIECES_CONFIG: Record<string, SpecialSituationConfig> = {
  'CORNER': {
    baseDuration: 12,
    ballPosition: 'CURRENT',
    possession: 'ATTACKING_TEAM',
    nextSituation: 'NORMAL',
    canScoreDirectly: true,
    narrative: "Le ballon est placé au coin du terrain. Corner à suivre !"
  },
  'PENALTY': {
    baseDuration: 25,
    ballPosition: 'PENALTY_SPOT',
    possession: 'FOULED_TEAM',
    nextSituation: 'NORMAL',
    canScoreDirectly: true,
    narrative: "PENALTY ! {playerName} s'avance pour défier le gardien..."
  },
  'GOAL_KICK': {
    baseDuration: 15,
    ballPosition: 'CURRENT', // Sera (0,2) ou (5,2) selon l'équipe
    possession: 'DEFENDING_TEAM',
    nextSituation: 'NORMAL',
    canScoreDirectly: false,
    narrative: "Le gardien prend son temps pour dégager en six-mètres."
  },
  'KICK_OFF_RESTART': {
    baseDuration: 5,
    ballPosition: 'CENTER',
    possession: 'CONCEDING_TEAM',
    nextSituation: 'NORMAL',
    canScoreDirectly: false,
    narrative: "Le jeu reprend après ce but."
  }
};

// ============================================
// SÉQUENCES CARTONS (Narratif enrichi)
// ============================================
export const CARD_SEQUENCES: Record<'YELLOW' | 'RED' | 'SECOND_YELLOW', EventSequence> = {
  'YELLOW': {
    phases: [
      { duration: 10, narrative: "L'arbitre interrompt le jeu et appelle {playerName}.", eventSubtype: 'FOUL' },
      { duration: 15, narrative: "Carton jaune pour {playerName} suite à cette intervention.", eventSubtype: 'CARD' }
    ],
    finalBallPosition: 'CURRENT',
    finalSituation: 'NORMAL',
    finalPossession: 'FOULED_TEAM'
  },
  'RED': {
    phases: [
      { duration: 15, narrative: "L'arbitre n'hésite pas une seconde et fonce vers {playerName} !", eventSubtype: 'FOUL' },
      { duration: 25, narrative: "CARTON ROUGE ! {playerName} est expulsé !", eventSubtype: 'CARD' },
      { duration: 20, narrative: "Le joueur quitte la pelouse sous les sifflets adverse." }
    ],
    finalBallPosition: 'CURRENT',
    finalSituation: 'NORMAL',
    finalPossession: 'FOULED_TEAM'
  },
  'SECOND_YELLOW': {
    phases: [
      { duration: 10, narrative: "Nouvelle faute de {playerName}...", eventSubtype: 'FOUL' },
      { duration: 10, narrative: "L'arbitre sort le jaune... puis le rouge !", eventSubtype: 'CARD' },
      { duration: 20, narrative: "{playerName} est exclu pour un second avertissement." }
    ],
    finalBallPosition: 'CURRENT',
    finalSituation: 'NORMAL',
    finalPossession: 'FOULED_TEAM'
  }
};