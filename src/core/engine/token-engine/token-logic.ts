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
function applyMove(pos: { x: number, y: number }, moveX: number, moveY: number) {
  const newX = pos.x + moveX;
  const newY = pos.y + moveY;
  const outX = newX < 0 || newX > 5;
  const outY = newY < 0 || newY > 4;
  return {
    moveX: outX ? 0 : moveX,
    moveY: outY ? 0 : moveY,
    outX,
    outY
  };
}
import type { Token } from "./types";

function rnd(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export const TOKEN_LOGIC = {
  // --- CONSTRUCTION ---
  'PASS_SHORT': (t: Token, p: string, h: boolean, b: { x: number, y: number }) => {
    const moveX = h ? 1 : -1;
    const moveY = b.y === 0 ? rnd(0, 1) : b.y === 4 ? rnd(-1, 0) : rnd(-1, 1);
    const res = applyMove(b, moveX, moveY);
    const out = res.outX || res.outY;
    return {
      moveX: res.moveX,
      moveY: res.moveY,
      isPass: true,
      success: !out,
      narrative: out ? `${p} tente une passe courte, mais le ballon sort !` : `${p} assure une passe courte.`,
      logMessage: out ? `${p} tente une passe courte, mais le ballon sort !` : `${p} assure une passe courte.`,
      customDuration: 4,
      nextSituation: res.outX ? (h ? 'CORNER' : 'GOAL_KICK') : res.outY ? 'TOUCH' : undefined
    };
  },

  'PASS_LATERAL': (t: Token, p: string, h: boolean, b: { x: number, y: number }) => {
    const moveX = 0;
    const moveY = b.y === 0 ? rnd(0, 1) : b.y === 4 ? rnd(-1, 0) : (Math.random() > 0.5 ? 1 : -1);
    const res = applyMove(b, moveX, moveY);
    const out = res.outY;
    return {
      moveX: res.moveX,
      moveY: res.moveY,
      isPass: true,
      success: !out,
      narrative: out ? `${p} tente une passe latérale, mais le ballon sort !` : `${p} écarte le jeu sur l'aile.`,
      logMessage: out ? `${p} tente une passe latérale, mais le ballon sort !` : `${p} écarte le jeu sur l'aile.`,
      customDuration: 5,
      nextSituation: out ? 'TOUCH' : undefined
    };
  },

  // --- FINITION ---
  'SHOOT_GOAL': (t: Token, p: string, h: boolean) => ({
    isGoal: true,
    isShot: true,
    shotOnTarget: true,
    narrative: `BUT !!! Frappe chirurgicale de {player} !`,
    logMessage: `BUT !!! Frappe chirurgicale de ${p} !`,
    playerName: p,
    customDuration: 15
  }),

  'SHOOT_SAVED': (t: Token, p: string, h: boolean) => ({
    turnover: true, // IMPORTANT : Le gardien récupère la balle
    logMessage: `Énorme arrêt du gardien sur cette tentative de ${p} !`,
    customDuration: 8
  }),

  // --- DÉFENSE ---
  'TACKLE': (t: Token, p: string, h: boolean) => ({
    turnover: true,
    isTackle: true,
    narrative: `${p} récupère le ballon d'un tacle glissé !`,
    logMessage: `${p} récupère le ballon d'un tacle glissé !`,
    customDuration: 4
  }),

  'INTERCEPT': (t: Token, p: string, h: boolean) => ({
    turnover: true,
    logMessage: `${p} coupe la trajectoire et intercepte !`,
    customDuration: 3
  }),

  'CLEARANCE': (t: Token, p: string, h: boolean, b: { x: number, y: number }) => {
    const moveX = h ? 2 : -2;
    const moveY = b.y === 0 ? rnd(0, 1) : b.y === 4 ? rnd(-1, 0) : rnd(-1, 1);
    const res = applyMove(b, moveX, moveY);
    return {
      moveX: res.moveX,
      moveY: res.moveY,
      turnover: true,
      logMessage: `${p} dégage loin devant !`,
      customDuration: 5,
      nextSituation: res.outX ? (h ? 'CORNER' : 'GOAL_KICK') : res.outY ? 'TOUCH' : undefined
    };
  },
  'DRIBBLE': (t: Token, p: string, h: boolean, b: { x: number, y: number }) => {
    const moveX = h ? 1 : -1;
    const moveY = 0;
    const nx = b.x + moveX;
    const ny = b.y + moveY;
    const bounds = checkBoundaries(nx, ny);
    return {
      moveX: bounds.x - b.x,
      moveY: bounds.y - b.y,
      out: bounds.outX || bounds.outY,
      logMessage: bounds.outX ? `${p} tente de dribbler, mais le ballon sort !` : `${p} progresse balle au pied.`,
      customDuration: 5,
      nextSituation: bounds.outX ? (h ? 'CORNER' : 'GOAL_KICK') : bounds.outY ? 'TOUCH' : undefined
    };
  },

  'CROSS': (t: Token, p: string, h: boolean, b: { x: number, y: number }) => {
    const targetX = h ? 0 : 5;
    const targetY = 2;
    const moveX = targetX - b.x;
    const moveY = targetY - b.y;
    const nx = b.x + moveX;
    const ny = b.y + moveY;
    const bounds = checkBoundaries(nx, ny);
    return {
      moveX: bounds.x - b.x,
      moveY: bounds.y - b.y,
      out: bounds.outX || bounds.outY,
      logMessage: `${p} adresse un centre dangereux dans la surface.`,
      customDuration: 7,
      nextSituation: bounds.outX ? (h ? 'CORNER' : 'GOAL_KICK') : bounds.outY ? 'TOUCH' : undefined
    };
  },

  'PASS_THROUGH': (t: Token, p: string, h: boolean, b: { x: number, y: number }) => {
    const moveX = h ? 2 : -2;
    const moveY = 0;
    const nx = b.x + moveX;
    const ny = b.y + moveY;
    const bounds = checkBoundaries(nx, ny);
    return {
      moveX: bounds.x - b.x,
      moveY: bounds.y - b.y,
      out: bounds.outX || bounds.outY,
      logMessage: bounds.outX ? `${p} tente une passe en profondeur, mais le ballon sort !` : `${p} lance une passe en profondeur !`,
      customDuration: 6,
      nextSituation: bounds.outX ? 'GOAL_KICK' : bounds.outY ? 'TOUCH' : undefined
    };
  },

  'GK_SHORT': (t: Token, p: string, h: boolean, b: { x: number, y: number }) => {
    const moveX = h ? 1 : -1;
    const moveY = 0;
    const res = applyMove(b, moveX, moveY);
    return {
      moveX: res.moveX,
      moveY: res.moveY,
      logMessage: `${p} relance court depuis sa surface.`,
      customDuration: 5,
      nextSituation: 'NORMAL'
    };
  },

  'GK_LONG': (t: Token, p: string, h: boolean, b: { x: number, y: number }) => {
    const moveX = h ? 3 : -3;
    const moveY = 0;
    const res = applyMove(b, moveX, moveY);
    return {
      moveX: res.moveX,
      moveY: res.moveY,
      logMessage: `${p} relance longue vers l'avant !`,
      customDuration: 7,
      nextSituation: 'NORMAL'
    };
  },

  'BLOCK_SHOT': (t: Token, p: string, h: boolean, b: { x: number, y: number }) => ({
    turnover: true,
    logMessage: `${p} contre la frappe !`,
    customDuration: 4
  }),

  'SHOOT_OFF': (t: Token, p: string, h: boolean, b: { x: number, y: number }) => {
    return {
      turnover: true,
      nextSituation: 'GOAL_KICK',
      logMessage: `La frappe de ${p} s'envole dans les tribunes !`,
      playerName: p,
      customDuration: 10
    };
  },

  'DRIBBLE_SHOT': (t: Token, p: string, h: boolean, b: { x: number, y: number }) => {
    const moveX = h ? 1 : -1;
    const res = applyMove(b, moveX, 0);
    const isGoal = Math.random() < 0.5;
    return {
      moveX: res.moveX,
      moveY: res.moveY,
      isGoal,
      turnover: !isGoal,
      logMessage: isGoal ? `BUT !!! ${p} dribble et marque !` : `Le tir de ${p} est arrêté !`,
      playerName: p,
      customDuration: 12
    };
  },

  // --- ACTIONS SPÉCIALES ---
  'CELEBRATION': (t: Token) => ({ logMessage: "Célébration !", customDuration: 30 }),
  'PLACEMENT': (t: Token) => ({ logMessage: "Les joueurs se replacent.", customDuration: 20 }),
};