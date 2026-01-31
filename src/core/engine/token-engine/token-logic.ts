// /src/core/engine/token-engine/token-logic.ts
import type { Token, BallPosition } from "./types";
// === Grille 6x5 ===
// |     |       |       |       |       |       |       |
// | :-: | :---: | :---: | :---: | :---: | :---: | :---: |
// |     | X = 0 | X = 1 | X = 2 | X = 3 | X = 4 | X = 5 |
// | Y=0 | 0 0   | 1 0   | 2 0   | 3 0   | 4 0   | 5 0   |
// | Y=1 | 0 1   | 1 1   | 2 1   | 3 1   | 4 1   | 5 1   |
// | Y=2 | 0 2   | 1 2   | 2 2   | 3 2   | 4 2   | 5 2   |
// | Y=3 | 0 3   | 1 3   | 2 3   | 3 3   | 4 3   | 5 3   |
// | Y=4 | 0 4   | 1 4   | 2 4   | 3 4   | 4 4   | 5 4   |
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
function applyMove(pos: BallPosition, moveX: number, moveY: number) {
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

import type { TokenActionResult } from "./action-result";

export const TOKEN_LOGIC: Record<string, (t: Token, p1: string, h: boolean, b: BallPosition) => TokenActionResult> = {
  // --- PASSES ---
  'PASS_SHORT': (t, p1, h, b) => {
    // Passe courte : 1 case max, rectiligne, ne sort jamais
    let dx = h ? 1 : -1;
    if ((h && b.x >= 5) || (!h && b.x <= 0)) dx = 0;
    const res = applyMove(b, dx, 0);
    return {
      moveX: res.moveX,
      moveY: res.moveY,
      logMessage: undefined,
      turnover: false,
      stats: { passes: 1 },
      customDuration: 4,
    };
  },

  'PASS_BACK': (t, p1, h, b) => {
    // Passe en retrait : 1 case max, rectiligne, ne sort jamais
    let dx = h ? -1 : 1;
    if ((h && b.x <= 0) || (!h && b.x >= 5)) dx = 0;
    const res = applyMove(b, dx, 0);
    return {
      moveX: res.moveX,
      moveY: res.moveY,
      logMessage: undefined,
      turnover: false,
      stats: { passes: 1 },
      customDuration: 4,
    };
  },

  'PASS_LONG': (t, p1, h, b) => {
    // Passe longue : max 3 cases, rectiligne, ne sort jamais
    let maxDist = h ? 5 - b.x : b.x;
    let dist = Math.min(3, Math.max(1, maxDist));
    const res = applyMove(b, h ? dist : -dist, 0);
    return {
      moveX: res.moveX,
      moveY: res.moveY,
      logMessage: undefined,
      turnover: false,
      stats: { passes: 1 },
      customDuration: 4 + dist,
    };
  },

  'PASS_LATERAL': (t, p1, h, b) => {
    // Passe latérale : 1 case latérale stricte, ne sort jamais
    let dy = b.y <= 2 ? 1 : -1;
    if ((b.y === 0 && dy < 0) || (b.y === 4 && dy > 0)) dy = 0;
    const res = applyMove(b, 0, dy);
    return {
      moveX: res.moveX,
      moveY: res.moveY,
      logMessage: undefined,
      turnover: false,
      stats: { passes: 1 },
      customDuration: 5,
    };
  },

  'PASS_THROUGH': (t, p1, h, b) => {
    // Passe en profondeur : rectiligne, ne sort jamais
    let dist = 2;
    if ((h && b.x >= 4) || (!h && b.x <= 1)) {
      dist = 1;
    }
    const res = applyMove(b, h ? dist : -dist, 0);
    return {
      moveX: res.moveX,
      moveY: res.moveY,
      logMessage: undefined,
      turnover: false,
      stats: { passes: 1 },
      customDuration: 5 + dist,
    };
  },

  'PASS_MISS': (t, p1, h, b) => {
    // Distance aléatoire : 1 (short), 2 (medium), 3 (long)
    const dist = rnd(1, 3);
    const res = applyMove(b, h ? dist : -dist, rnd(-1, 1));
    return {
      moveX: res.moveX,
      moveY: res.moveY,
      logMessage: res.isOut ? `{p1} tente la passe de trop et perd le ballon.` : undefined,
      turnover: true, // Risque élevé de perte de balle
      stats: { passes: 1 },
      customDuration: 4 + dist, // Plus long si la passe est longue
    };
  },

  // --- FINITION ---
  'SHOOT_GOAL': (t, p1) => ({
    isGoal: true,
    moveX: 0, moveY: 0,
    logMessage: `BUT !!! Quelle frappe chirurgicale de {p1} !`,
    stats: { shots: 1, shotsOnTarget: 1, goals: 1 },
    customDuration: 60,
    specialEffect: 'goal'
  }),


  'SHOOT_SAVED': (t, p1, h) => ({
    turnover: true,
    moveX: 0, moveY: 0,
    logMessage: `Énorme arrêt du gardien sur cette tentative de {p1} !`,
    stats: { shots: 1, saves: 1 },
    customDuration: 8,
    nextBallPosition: h ? { x: 5, y: 2 } : { x: 0, y: 2 }
  }),

  'SHOOT_OFF': (t, p1, h) => ({
    turnover: true,
    moveX: 0, moveY: 0,
    logMessage: `La frappe de {p1} s'envole directement dans les tribunes !`,
    stats: { shots: 1 },
    customDuration: 10,
    nextBallPosition: h ? { x: 5, y: 2 } : { x: 0, y: 2 }
  }),

  'DRIBBLE_SHOT': (t, p1, h, b) => {
    const res = applyMove(b, h ? 1 : -1, 0);
    return {
      moveX: res.moveX, moveY: res.moveY,
      turnover: true,
      stats: { dribbles: 1, shots: 1 },
      customDuration: 8
    };
  },

  // --- DÉFENSE ---
  'TACKLE': (t, p1) => ({
    turnover: true,
    moveX: 0, moveY: 0,
    logMessage: `{p1} récupère le ballon d'un tacle glissé impeccable !`,
    stats: { tackles: 1 },
    customDuration: 4
  }),

  'INTERCEPT': (t, p1) => ({
    turnover: true,
    moveX: 0, moveY: 0,
    logMessage: `{p1} a tout lu et intercepte proprement le ballon !`,
    stats: { interceptions: 1 },
    customDuration: 3
  }),

  'BLOCK_SHOT': (t, p1, h, b) => {
    // Rebond : ballon dévié aléatoirement, pas de turnover immédiat
    const dx = rnd(-1, 1); // Léger rebond dans n'importe quelle direction X
    const dy = rnd(-1, 1); // Léger rebond latéral
    const res = applyMove(b, dx, dy);
    return {
      moveX: res.moveX,
      moveY: res.moveY,
      turnover: false, // Pas de changement de possession immédiat
      logMessage: `{p1} se jette et contre la frappe adverse, le ballon traîne !`,
      stats: { blocks: 1 },
      customDuration: 4,
    };
  },

  'CLEARANCE': (t, p1, h, b) => {
    // Dégagement : puissant, mais jamais au-delà de la surface adverse
    let maxDist = h ? 5 - b.x : b.x;
    let dist = Math.min(2 + rnd(0,1), Math.max(1, maxDist)); // 2 ou 3 cases, mais jamais plus loin que la surface adverse
    const res = applyMove(b, h ? dist : -dist, rnd(-1, 1));
    return {
      moveX: res.moveX,
      moveY: res.moveY,
      turnover: true,
      logMessage: `{p1} ne prend aucun risque et dégage loin devant !`,
      stats: { clearances: 1 },
      customDuration: 5 + dist,
    };
  },

  // --- DRIBBLE & CENTRE ---
  'DRIBBLE': (t, p1, h, b) => {
    // Dribble : avance d'une zone comme une passe courte, ne sort jamais du terrain
    let dx = h ? 1 : -1;
    if ((h && b.x >= 5) || (!h && b.x <= 0)) dx = 0;
    const res = applyMove(b, dx, 0);
    return {
      moveX: res.moveX,
      moveY: res.moveY,
      logMessage: undefined, // Pas de sortie de terrain sur dribble
      turnover: false,
      stats: { dribbles: 1 },
      customDuration: 5,
    };
  },

  'CUT_INSIDE': (t, p1, h, b) => {
    // Repique vers l'axe (Y=2), avance d'une case si possible, ne sort jamais du terrain
    let dx = h ? 1 : -1;
    if ((h && b.x >= 5) || (!h && b.x <= 0)) dx = 0;
    let dy = 2 - b.y;
    // Limite le déplacement latéral pour rester dans la grille
    if (b.y === 2) dy = 0;
    if ((b.y === 0 && dy < 0) || (b.y === 4 && dy > 0)) dy = 0;
    const res = applyMove(b, dx, dy);
    return {
      moveX: res.moveX,
      moveY: res.moveY,
      logMessage: undefined,
      turnover: false,
      stats: { dribbles: 1 },
      customDuration: 5,
    };
  },

  'CROSS': (t, p1, h, b) => {
    // Centre optimisé : vise la surface adverse sans sortir du terrain
    const targetX = h ? 5 : 0;
    let dx = targetX - b.x;
    // Si déjà dans la surface adverse, centre en retrait
    if ((h && b.x >= 4) || (!h && b.x <= 1)) dx = h ? -1 : 1;
    // Calcul Y cible (central, mais jamais hors terrain)
    let targetY = 2 + rnd(-1, 1);
    targetY = Math.max(0, Math.min(4, targetY));
    let dy = targetY - b.y;
    // Empêche de sortir du terrain
    if ((b.y === 0 && dy < 0) || (b.y === 4 && dy > 0)) dy = 0;
    const res = applyMove(b, dx, dy);
    return {
      moveX: res.moveX,
      moveY: res.moveY,
      logMessage: `{p1} adresse un centre dangereux dans la surface !`,
      turnover: res.isOut,
      stats: { crosses: 1 },
      customDuration: 7,
    };
  },

  // --- GARDIEN & LONG BALL ---
  'GK_SHORT': (t, p1, h, b) => {
    // Même logique que PASS_SHORT : 1 case max, rectiligne, ne sort jamais
    let dx = h ? 1 : -1;
    if ((h && b.x >= 5) || (!h && b.x <= 0)) dx = 0;
    const res = applyMove(b, dx, 0);
    return {
      moveX: res.moveX, moveY: res.moveY,
      logMessage: `{p1} relance court proprement depuis sa surface.`,
      turnover: false,
      stats: { gkPasses: 1 },
      customDuration: 5,
      nextSituation: 'NORMAL'
    };
  },

  'GK_LONG': (t, p1, h, b) => {
    // Même logique que PASS_LONG : max 3 cases, rectiligne, ne sort jamais
    let maxDist = h ? 5 - b.x : b.x;
    let dist = Math.min(3, Math.max(1, maxDist));
    const res = applyMove(b, h ? dist : -dist, 0);
    return {
      moveX: res.moveX, moveY: res.moveY,
      logMessage: `{p1} dégage le ballon d'une longue relance aérienne !`,
      turnover: false,
      stats: { gkLongPasses: 1 },
      customDuration: 7,
      nextSituation: 'NORMAL'
    };
  },

  'TRANSVERSAL': (t, p1, h, b) => {
    // Passe transversale : vise l’aile opposée (Y=0 ou Y=4), avance de 2 ou 3 cases
    let dx = h ? rnd(2, 3) : -rnd(2, 3);
    let targetY = b.y < 2 ? 4 : 0; // Si à gauche, vise droite, sinon gauche
    let dy = targetY - b.y;
    // Limite le déplacement latéral pour rester dans la grille
    if (Math.abs(dy) > 3) dy = dy > 0 ? 3 : -3;
    const res = applyMove(b, dx, dy);
    return {
      moveX: res.moveX,
      moveY: res.moveY,
      logMessage: `{p1} renverse le jeu d'une transversale spectaculaire !`,
      turnover: res.isOut,
      stats: { longBalls: 1 },
      customDuration: 8,
    };
  },

  // --- FAUTE ---
  'FOUL': (t, p1) => ({
    turnover: true,
    moveX: 0, moveY: 0,
    logMessage: `Coup de sifflet ! {p1} commet une faute sur {p2}.`,
    stats: { fouls: 1 },
    customDuration: 6,
  })
};