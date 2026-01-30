import type { Token } from "./types";

function rnd(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export const TOKEN_LOGIC = {
  // --- CONSTRUCTION ---
  'PASS_SHORT': (t: Token, p: string, h: boolean, b: { y: number }) => ({
    moveX: h ? 1 : -1,
    moveY: b.y === 0 ? rnd(0, 1) : b.y === 4 ? rnd(-1, 0) : rnd(-1, 1),
    logMessage: `${p} assure une passe courte.`,
    customDuration: 4
  }),

  'PASS_LATERAL': (t: Token, p: string, h: boolean, b: { y: number }) => ({
    moveX: 0,
    moveY: b.y === 0 ? rnd(0, 1) : b.y === 4 ? rnd(-1, 0) : (Math.random() > 0.5 ? 1 : -1),
    logMessage: `${p} écarte le jeu sur l'aile.`,
    customDuration: 5
  }),

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

  'CLEARANCE': (t: Token, p: string, h: boolean, b: { y: number }) => ({
    moveX: h ? 2 : -2,
    moveY: b.y === 0 ? rnd(0, 1) : b.y === 4 ? rnd(-1, 0) : rnd(-1, 1),
    turnover: true, // Un dégagement rend souvent la balle à l'adversaire ou la met loin
    logMessage: `${p} dégage loin devant !`,
    customDuration: 5
  }),

  // --- ACTIONS SPÉCIALES ---
  'CELEBRATION': (t: Token) => ({ logMessage: "Célébration !", customDuration: 30 }),
  'PLACEMENT': (t: Token) => ({ logMessage: "Les joueurs se replacent.", customDuration: 20 }),
};