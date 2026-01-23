import { Token, TokenExecutionResult, GridPosition } from "../types";

const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

export const TOKEN_LOGIC: Record<string, (token: Token, pName: string, isHome: boolean, ballPos: GridPosition) => TokenExecutionResult> = {
    // --- OFFENSE ---
    'PASS': (t, p, h) => ({ moveX: h ? 1 : -1, moveY: rnd(-1, 1), possessionChange: false, isGoal: false, isEvent: false, logMessage: `${p} assure sa transmission.`, customDuration: rnd(3, 5), stats: { isPass: true, isSuccess: true } }),
    'KEY_PASS': (t, p, h) => ({ moveX: h ? 1 : -1, moveY: 0, possessionChange: false, isGoal: false, isEvent: false, logMessage: `Superbe ouverture de ${p} !`, customDuration: 5, stats: { isPass: true, isSuccess: true, isChanceCreated: true } }),
    'CROSS': (t, p, h, b) => ({ moveX: h ? (4 - b.x) : -(b.x - 1), moveY: 2 - b.y, possessionChange: false, isGoal: false, isEvent: false, logMessage: `${p} adresse un centre dans la boîte.`, customDuration: rnd(4, 7), stats: { isPass: true, isSuccess: true, xg: 0.05 } }),
    'CUT_BACK': (t, p, h, b) => ({ moveX: 0, moveY: 2 - b.y, possessionChange: false, isGoal: false, isEvent: false, logMessage: `${p} centre en retrait !`, customDuration: 6, stats: { isPass: true, isSuccess: true, xg: 0.2 } }),
    'HEAD_SHOT': (t, p) => ({ moveX: 0, moveY: 0, possessionChange: true, isGoal: Math.random() < 0.2, isEvent: true, eventSubtype: 'SHOT', logMessage: `Tête puissante de ${p} !`, customDuration: 4, stats: { xg: 0.25 } }),
    'SHOOT_GOAL': (t, p) => ({ moveX: 0, moveY: 0, possessionChange: true, isGoal: true, isEvent: true, eventSubtype: 'GOAL', logMessage: `BUT !!! Frappe chirurgicale de ${p} !`, customDuration: 60, stats: { xg: 1.0 } }),
    'SHOOT_SAVED': (t, p) => ({ moveX: 0, moveY: 0, possessionChange: true, isGoal: false, isEvent: true, eventSubtype: 'SAVE', logMessage: `Arrêt magistral sur cette frappe de ${p} !`, customDuration: 15, stats: { xg: 0.1 } }),
    'SHOOT_WOODWORK': (t, p) => ({ moveX: 0, moveY: 0, possessionChange: true, isGoal: false, isEvent: true, eventSubtype: 'WOODWORK', logMessage: `LA BARRE ! La frappe de ${p} s'écrase sur le montant !`, customDuration: 10, stats: { xg: 0.4 } }),
    'SHOOT_OFF_TARGET': (t, p, h, b) => ({ moveX: h ? (5 - b.x) : -b.x, moveY: 2 - b.y, possessionChange: true, isGoal: false, isEvent: true, logMessage: `La frappe de ${p} n'est pas cadrée.`, customDuration: 20, stats: { xg: 0.02 } }),
    'REBOUND': (t, p) => ({ moveX: 0, moveY: 0, possessionChange: false, isGoal: false, isEvent: false, logMessage: `Le ballon revient dans les pieds de ${p} !`, customDuration: 3 }),

    // --- DEFENSE ---
    'TACKLE': (t, p) => ({ moveX: 0, moveY: 0, possessionChange: true, isGoal: false, isEvent: false, logMessage: `Superbe tacle de ${p}.`, customDuration: 4, stats: { isDuel: true, isSuccess: true } }),
    'BLOCK': (t, p) => ({ moveX: 0, moveY: 0, possessionChange: true, isGoal: false, isEvent: false, logMessage: `Intervention décisive de ${p} !`, customDuration: 3, stats: { isDuel: true, isSuccess: true } }),
    'CLEARANCE': (t, p, h) => ({ moveX: h ? -2 : 2, moveY: rnd(-1, 1), possessionChange: true, isGoal: false, isEvent: false, logMessage: `${p} dégage le ballon loin devant.`, customDuration: 5 }),

    // --- SITUATIONS ---
    'CORNER_GOAL': (t, p, h, b) => ({ moveX: h ? (4 - b.x) : -(b.x - 1), moveY: 2 - b.y, possessionChange: true, isGoal: true, isEvent: true, eventSubtype: 'GOAL', logMessage: `BUT SUR CORNER ! Tête de ${p} !`, customDuration: 60, stats: { xg: 1.0 } }),
    'PENALTY_GOAL': (t, p) => ({ moveX: 0, moveY: 0, possessionChange: true, isGoal: true, isEvent: true, eventSubtype: 'PENALTY', logMessage: `${p} transforme son penalty !`, customDuration: 60, stats: { xg: 0.76 } }),
    'GK_SHORT': (t, p, h) => ({ moveX: h ? 1 : -1, moveY: rnd(-1, 1), possessionChange: false, isGoal: false, isEvent: false, logMessage: `Relance courte de ${p}.`, customDuration: 15 }),
    'GK_LONG': (t, p, h) => ({ moveX: h ? 3 : -3, moveY: rnd(-1, 1), possessionChange: false, isGoal: false, isEvent: false, logMessage: `Dégagement puissant de ${p}.`, customDuration: 20 }),

    // --- SYSTEM ---
    'NEUTRAL_POSSESSION': () => ({ moveX: rnd(-1, 1), moveY: rnd(-1, 1), possessionChange: true, isGoal: false, isEvent: false, logMessage: `Duel pour le ballon.`, customDuration: 5 }),
    'SYSTEM': () => ({ moveX: 0, moveY: 0, possessionChange: false, isGoal: false, isEvent: false, logMessage: `...`, customDuration: 2 })
};
