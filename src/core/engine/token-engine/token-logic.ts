import type { Token } from "./types";

function rnd(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export const TOKEN_LOGIC = {
  // --- CONSTRUCTION ---
  'PASS_SHORT': (t: Token, p: string, h: boolean, b: { x: number, y: number }) => {
    let moveX = h ? 1 : -1;
    let newX = b.x + moveX;
    let out = false;
    if (newX < 0 || newX > 5) {
      out = true;
      moveX = 0;
    }
    return {
      moveX: out ? 0 : moveX,
      moveY: b.y === 0 ? rnd(0, 1) : b.y === 4 ? rnd(-1, 0) : rnd(-1, 1),
      logMessage: out ? `${p} tente une passe courte, mais le ballon sort !` : `${p} assure une passe courte.`,
      customDuration: 4,
      nextSituation: out ? (h ? 'CORNER' : 'GOAL_KICK') : undefined
    };
  },

  'PASS_LATERAL': (t: Token, p: string, h: boolean, b: { x: number, y: number }) => {
    let moveY = b.y === 0 ? rnd(0, 1) : b.y === 4 ? rnd(-1, 0) : (Math.random() > 0.5 ? 1 : -1);
    let newY = b.y + moveY;
    let out = false;
    if (newY < 0 || newY > 4) {
      out = true;
      moveY = 0;
    }
    return {
      moveX: 0,
      moveY: out ? 0 : moveY,
      logMessage: out ? `${p} tente une passe latérale, mais le ballon sort !` : `${p} écarte le jeu sur l'aile.`,
      customDuration: 5,
      nextSituation: out ? 'TOUCH' : undefined
    };
  },

  // --- FINITION ---
  'SHOOT_GOAL': (t: Token, p: string, h: boolean) => ({
    isGoal: true,
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
    turnover: true, // IMPORTANT : La balle change de camp
    logMessage: `${p} récupère le ballon d'un tacle glissé !`,
    customDuration: 4
  }),

  'INTERCEPT': (t: Token, p: string, h: boolean) => ({
    turnover: true,
    logMessage: `${p} coupe la trajectoire et intercepte !`,
    customDuration: 3
  }),

  'CLEARANCE': (t: Token, p: string, h: boolean, b: { x: number, y: number }) => {
    // Dégagement toujours vers l'avant, jamais derrière
    let moveX = h ? Math.max(1, 2) : Math.min(-1, -2);
    let newX = b.x + moveX;
    if ((h && newX < b.x) || (!h && newX > b.x)) moveX = 0;
    // Empêche de sortir du terrain
    if (newX < 0) moveX = 0;
    if (newX > 5) moveX = 0;
    return {
      moveX,
      moveY: b.y === 0 ? rnd(0, 1) : b.y === 4 ? rnd(-1, 0) : rnd(-1, 1),
      turnover: true,
      logMessage: `${p} dégage loin devant !`,
      customDuration: 5
    };
  },

  // --- ACTIONS SPÉCIALES ---
  'CELEBRATION': (t: Token) => ({ logMessage: "Célébration !", customDuration: 30 }),
  'PLACEMENT': (t: Token) => ({ logMessage: "Les joueurs se replacent.", customDuration: 20 }),
};