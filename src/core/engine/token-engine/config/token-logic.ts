import { Token, TokenExecutionResult, GridPosition } from "../types";

const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

export const TOKEN_LOGIC: Record<string, (token: Token, pName: string, isHome: boolean, ballPos: GridPosition) => TokenExecutionResult> = {
    // --- 1. PROGRESSION (OFFENSE) ---
    'PASS_SHORT': (t, p, h) => ({ 
        moveX: h ? 1 : -1, moveY: rnd(-1, 1), 
        possessionChange: false, isGoal: false, isEvent: false, 
        logMessage: `${p} joue court.`, customDuration: rnd(2, 4), 
        stats: { isPass: true, isSuccess: true } 
    }),
    'PASS_LONG': (t, p, h) => ({ 
        moveX: h ? 2 : -2, moveY: rnd(-1, 1), 
        possessionChange: false, isGoal: false, isEvent: false, 
        logMessage: `${p} allonge le jeu.`, customDuration: rnd(4, 6), 
        stats: { isPass: true, isSuccess: true } 
    }),
    'PASS_BACK': (t, p, h) => ({ 
        moveX: h ? -1 : 1, moveY: rnd(-1, 1), 
        possessionChange: false, isGoal: false, isEvent: false, 
        logMessage: `${p} assure en retrait.`, customDuration: 3, 
        stats: { isPass: true, isSuccess: true } 
    }),
    'PASS_SWITCH': (t, p, h, b) => ({ 
        moveX: 0, moveY: b.y <= 2 ? 2 : -2, 
        possessionChange: false, isGoal: false, isEvent: false, 
        logMessage: `${p} renverse le jeu.`, customDuration: 5, 
        stats: { isPass: true, isSuccess: true } 
    }),
    'DRIBBLE': (t, p, h) => ({ 
        moveX: h ? 1 : -1, moveY: 0, 
        possessionChange: false, isGoal: false, isEvent: false, 
        logMessage: `${p} élimine son vis-à-vis !`, customDuration: 4, 
        stats: { isDuel: true, isSuccess: true } 
    }),
    'DRIBBLE_LOST': (t, p) => ({ 
        moveX: 0, moveY: 0, possessionChange: true, 
        isGoal: false, isEvent: false, 
        logMessage: `${p} perd le ballon sur son dribble.`, customDuration: 3, 
        stats: { isDuel: true, isSuccess: false } 
    }),

    // --- 2. FINITION (SHOTS) ---
    'SHOOT_GOAL': (t, p) => ({ 
        moveX: 0, moveY: 0, possessionChange: true, 
        isGoal: true, isEvent: true, eventSubtype: 'GOAL', 
        logMessage: `BUT !!! Frappe chirurgicale de ${p} !`, customDuration: 60, 
        stats: { xg: 0.35 } 
    }),
    'SHOOT_SAVED': (t, p, h, b) => ({ 
        moveX: h ? (5 - b.x) : -b.x, moveY: 2 - b.y, 
        possessionChange: true, isGoal: false, isEvent: true, eventSubtype: 'SAVE', 
        nextSituation: 'GK_POSSESSION', 
        logMessage: `Arrêt magistral sur cette frappe de ${p} !`, customDuration: 5, 
        stats: { xg: 0.15 } 
    }),
    'SHOOT_OFF_TARGET': (t, p, h, b) => ({ 
        moveX: h ? (5 - b.x) : -b.x, moveY: 2 - b.y, 
        possessionChange: true, isGoal: false, isEvent: true, 
        nextSituation: 'GOAL_KICK', 
        logMessage: `La frappe de ${p} n'est pas cadrée.`, customDuration: 20, 
        stats: { xg: 0.10 } 
    }),
    'SHOOT_WOODWORK': (t, p) => ({ 
        moveX: 0, moveY: 0, possessionChange: true, 
        isGoal: false, isEvent: true, eventSubtype: 'WOODWORK', 
        nextSituation: 'REBOUND_ZONE', 
        logMessage: `LA BARRE ! La frappe de ${p} s'écrase sur le montant !`, customDuration: 10, 
        stats: { xg: 0.20 } 
    }),

    // --- 3. DÉFENSE ---
    'TACKLE': (t, p) => ({ 
        moveX: 0, moveY: 0, possessionChange: true, 
        isGoal: false, isEvent: false, 
        logMessage: `Superbe tacle de ${p}.`, customDuration: 4, 
        stats: { isDuel: true, isSuccess: true } 
    }),
    'INTERCEPT': (t, p) => ({ 
        moveX: 0, moveY: 0, possessionChange: true, 
        isGoal: false, isEvent: false, 
        logMessage: `Interception de ${p} !`, customDuration: 3, 
        stats: { isInterception: true, isDuel: true, isSuccess: true } 
    }),
    'CLEARANCE': (t, p, h) => ({ 
        moveX: h ? -2 : 2, moveY: rnd(-1, 1), 
        possessionChange: true, isGoal: false, isEvent: false, 
        logMessage: `${p} dégage le ballon loin devant.`, customDuration: 5 
    }),

    // --- 4. GARDIEN (GK) ---
    'GK_POSSESSION': (t, p) => ({ 
        moveX: 0, moveY: 0, possessionChange: false, 
        isGoal: false, isEvent: false, 
        logMessage: `${p} capte le ballon et s'apprête à relancer.`, customDuration: 8 
    }),
    'CLAIM': (t, p, h, b) => ({ 
        moveX: h ? (5 - b.x) : -b.x, moveY: 2 - b.y, 
        possessionChange: true, isGoal: false, isEvent: true, eventSubtype: 'SAVE', 
        nextSituation: 'GK_POSSESSION',
        logMessage: `Le gardien capte sereinement le ballon.`, customDuration: 10 
    }),
    'PUNCH': (t, p, h) => ({ 
        moveX: h ? -1 : 1, moveY: rnd(-1, 1), 
        possessionChange: true, isGoal: false, isEvent: true, eventSubtype: 'SAVE', 
        logMessage: `Le gardien dégage du poing !`, customDuration: 5 
    }),
    'GK_SHORT': (t, p, h) => ({ 
        moveX: h ? 1 : -1, moveY: rnd(-1, 1), 
        possessionChange: false, isGoal: false, isEvent: false, 
        logMessage: `Relance courte de ${p}.`, customDuration: 10 
    }),
    'GK_LONG': (t, p, h) => ({ 
        moveX: h ? 3 : -3, moveY: rnd(-1, 1), 
        possessionChange: false, isGoal: false, isEvent: false, 
        logMessage: `Dégagement puissant de ${p}.`, customDuration: 15 
    }),

    // --- 5. COUPS DE PIED ARRÊTÉS ---
    'CORNER_GOAL': (t, p, h, b) => ({ 
        moveX: h ? (4 - b.x) : -(b.x - 1), moveY: 2 - b.y, 
        possessionChange: true, isGoal: true, isEvent: true, eventSubtype: 'GOAL', 
        logMessage: `BUT SUR CORNER ! Tête de ${p} !`, customDuration: 60, 
        stats: { xg: 0.18 } 
    }),
    'CORNER_OVERCOOKED': (t, p, h, b) => ({ 
        moveX: h ? (5 - b.x) : -b.x, moveY: 2 - b.y, 
        possessionChange: true, isGoal: false, isEvent: false, 
        nextSituation: 'GOAL_KICK', 
        logMessage: `Le corner traverse la surface sans trouver preneur.`, customDuration: 10 
    }),
    'PENALTY_GOAL': (t, p) => ({ 
        moveX: 0, moveY: 0, possessionChange: true, 
        isGoal: true, isEvent: true, eventSubtype: 'GOAL', 
        logMessage: `${p} transforme son penalty !`, customDuration: 60, 
        stats: { xg: 0.76 } 
    }),
    'THROW_IN_SAFE': (t, p, h) => ({ 
        moveX: h ? 1 : -1, moveY: 0, 
        possessionChange: false, isGoal: false, isEvent: false, 
        logMessage: `${p} effectue une touche courte.`, customDuration: 5 
    }),

    // --- 6. SYSTÈME ---
    'REBOUND': (t, p) => ({ 
        moveX: 0, moveY: 0, possessionChange: false, 
        isGoal: false, isEvent: false, 
        logMessage: `${p} récupère le second ballon !`, customDuration: 3 
    }),
    'NEUTRAL_POSSESSION': () => ({ 
        moveX: rnd(-1, 1), moveY: rnd(-1, 1), 
        possessionChange: true, isGoal: false, isEvent: false, 
        logMessage: `Duel pour le ballon.`, customDuration: 5 
    }),
    'SYSTEM': () => ({ moveX: 0, moveY: 0, possessionChange: false, isGoal: false, isEvent: false, logMessage: `...`, customDuration: 2 })
};
