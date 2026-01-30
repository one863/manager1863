// /src/core/engine/token-engine/token-logic.ts
import type { Token } from "./types";

/**
 * Vérifie si une position est dans les limites du terrain (6x5).
 * Retourne la position bridée et des indicateurs de sortie.
 */
function checkBoundaries(x: number, y: number) {
  const nx = Math.max(0, Math.min(5, x));
  const ny = Math.max(0, Math.min(4, y));
  return {
    x: nx,
    y: ny,
    outX: x < 0 || x > 5,
    outY: y < 0 || y > 4
  };
}

/**
 * Calcule un mouvement et vérifie s'il reste sur le terrain.
 */
function applyMove(pos: { x: number, y: number }, moveX: number, moveY: number) {
  const newX = pos.x + moveX;
  const newY = pos.y + moveY;
  const bounds = checkBoundaries(newX, newY);
  
  return {
    moveX: bounds.x - pos.x,
    moveY: bounds.y - pos.y,
    outX: bounds.outX,
    outY: bounds.outY,
    isOut: bounds.outX || bounds.outY
  };
}

function rnd(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export const TOKEN_LOGIC = {
  // --- PASSES ---
  'PASS_SHORT': (t: Token, p1: string, h: boolean, b: { x: number, y: number }) => {
    const res = applyMove(b, h ? 1 : -1, rnd(-1, 1));
    return {
      moveX: res.moveX,
      moveY: res.moveY,
      logMessage: res.isOut 
        ? `{p1} tente une passe courte, mais le ballon sort en touche !` 
        : `{p1} assure une passe courte vers {p2}.`,
      turnover: res.isOut,
      stats: { passes: 1 },
      customDuration: 4,
    };
  },

  'PASS_LATERAL': (t: Token, p1: string, h: boolean, b: { x: number, y: number }) => {
    const res = applyMove(b, 0, b.y <= 2 ? 1 : -1);
    return {
      moveX: res.moveX,
      moveY: res.moveY,
      logMessage: res.isOut 
        ? `{p1} veut écarter le jeu, mais sa passe est trop longue et sort !` 
        : `{p1} écarte le jeu sur l'aile pour {p2}.`,
      turnover: res.isOut,
      stats: { passes: 1 },
      customDuration: 5,
    };
  },

  'PASS_THROUGH': (t: Token, p1: string, h: boolean, b: { x: number, y: number }) => {
    const res = applyMove(b, h ? 2 : -2, 0);
    return {
      moveX: res.moveX,
      moveY: res.moveY,
      logMessage: res.isOut 
        ? `La passe en profondeur de {p1} est trop forte et sort du terrain.` 
        : `{p1} lance une passe magnifique en profondeur pour {p2} !`,
      turnover: res.isOut,
      stats: { passes: 1 },
      customDuration: 6,
    };
  },

  // --- FINITION ---
  'SHOOT_GOAL': (t: Token, p1: string) => ({
    isGoal: true,
    moveX: 0, moveY: 0,
    logMessage: `BUT !!! Quelle frappe chirurgicale de {p1} !`,
    stats: { shots: 1, shotsOnTarget: 1, goals: 1 },
    customDuration: 15
  }),

  'SHOOT_SAVED': (t: Token, p1: string) => ({
    turnover: true,
    moveX: 0, moveY: 0,
    logMessage: `Énorme arrêt du gardien sur cette tentative de {p1} !`,
    stats: { shots: 1, saves: 1 },
    customDuration: 8
  }),

  'SHOOT_OFF': (t: Token, p1: string) => ({
    turnover: true,
    moveX: 0, moveY: 0,
    logMessage: `La frappe de {p1} s'envole directement dans les tribunes !`,
    stats: { shots: 1 },
    customDuration: 10
  }),

  // --- DÉFENSE ---
  'TACKLE': (t: Token, p1: string) => ({
    turnover: true,
    moveX: 0, moveY: 0,
    logMessage: `{p1} récupère le ballon d'un tacle glissé impeccable !`,
    stats: { tackles: 1 },
    customDuration: 4
  }),

  'INTERCEPTION': (t: Token, p1: string) => ({
    turnover: true,
    moveX: 0, moveY: 0,
    logMessage: `{p1} a tout lu et intercepte proprement le ballon !`,
    stats: { interceptions: 1 },
    customDuration: 3
  }),

  'BLOCK_SHOT': (t: Token, p1: string) => ({
    turnover: true,
    moveX: 0, moveY: 0,
    logMessage: `{p1} se jette et contre la frappe adverse !`,
    stats: { blocks: 1 },
    customDuration: 4
  }),

  'CLEARANCE': (t: Token, p1: string, h: boolean, b: { x: number, y: number }) => {
    const res = applyMove(b, h ? 2 : -2, rnd(-1, 1));
    return {
      moveX: res.moveX,
      moveY: res.moveY,
      turnover: true,
      logMessage: `{p1} ne prend aucun risque et dégage loin devant !`,
      stats: { clearances: 1 },
      customDuration: 5,
    };
  },

  // --- DRIBBLE & CENTRE ---
  'DRIBBLE': (t: Token, p1: string, h: boolean, b: { x: number, y: number }) => {
    const res = applyMove(b, h ? 1 : -1, 0);
    return {
      moveX: res.moveX,
      moveY: res.moveY,
      logMessage: res.isOut 
        ? `{p1} perd le contrôle de sa course et le ballon sort.` 
        : `{p1} élimine son vis-à-vis et progresse balle au pied.`,
      turnover: res.isOut,
      stats: { dribbles: 1 },
      customDuration: 5,
    };
  },

  'CROSS': (t: Token, p1: string, h: boolean, b: { x: number, y: number }) => {
    // Un centre vise la surface adverse (X=5 pour Home, X=0 pour Away, Y central=2)
    const targetX = h ? 5 : 0;
    const res = applyMove(b, targetX - b.x, 2 - b.y);
    return {
      moveX: res.moveX,
      moveY: res.moveY,
      logMessage: `{p1} adresse un centre brossé dangereux dans la surface !`,
      turnover: res.isOut,
      stats: { crosses: 1 },
      customDuration: 7,
    };
  },

  // --- GARDIEN & LONG BALL ---
  'GK_SHORT': (t: Token, p1: string, h: boolean, b: { x: number, y: number }) => {
    const res = applyMove(b, h ? 1 : -1, 0);
    return {
      moveX: res.moveX, moveY: res.moveY,
      logMessage: `{p1} relance court proprement depuis sa surface.`,
      stats: { gkPasses: 1 },
      customDuration: 5,
    };
  },

  'GK_LONG': (t: Token, p1: string, h: boolean, b: { x: number, y: number }) => {
    const res = applyMove(b, h ? 3 : -3, 0);
    return {
      moveX: res.moveX, moveY: res.moveY,
      logMessage: `{p1} dégage le ballon d'une longue relance aérienne !`,
      stats: { gkLongPasses: 1 },
      customDuration: 7,
    };
  },

  'LONG_BALL': (t: Token, p1: string, h: boolean, b: { x: number, y: number }) => {
    const res = applyMove(b, h ? 3 : -3, rnd(-1, 1));
    return {
      moveX: res.moveX,
      moveY: res.moveY,
      logMessage: `{p1} tente une transversale ambitieuse vers l'avant !`,
      turnover: res.isOut,
      stats: { longBalls: 1 },
      customDuration: 8,
    };
  },

  // --- FAUTE ---
  'FOUL': (t: Token, p1: string) => ({
    turnover: true,
    moveX: 0, moveY: 0,
    logMessage: `Coup de sifflet ! {p1} commet une faute sur {p2}.`,
    stats: { fouls: 1 },
    customDuration: 6,
  }),

  // --- ACTIONS SPÉCIALES ---
  'CELEBRATION': () => ({ 
    logMessage: "Les supporters explosent de joie ! Célébration sur la pelouse.", 
    customDuration: 30 
  }),
  
  'PLACEMENT': () => ({ 
    logMessage: "L'arbitre demande le calme, les joueurs reprennent leur place.", 
    customDuration: 20 
  }),
};