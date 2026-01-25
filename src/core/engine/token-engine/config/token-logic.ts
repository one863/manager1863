import { Token, TokenExecutionResult, GridPosition } from "../types";

const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

export const TOKEN_LOGIC: Record<string, (token: Token, pName: string, isHome: boolean, ballPos: GridPosition) => TokenExecutionResult> = {
    // --- OFFENSE (Passes Unifiées) ---
    'PASS_SHORT': (t, p, h) => ({ 
        moveX: h ? 1 : -1, 
        moveY: rnd(-1, 1), 
        possessionChange: false, isGoal: false, isEvent: false, 
        logMessage: `${p} joue court.`, 
        customDuration: rnd(2, 4), 
        stats: { isPass: true, isSuccess: true } 
    }),
    'PASS_LONG': (t, p, h) => ({ 
        moveX: h ? 2 : -2, 
        moveY: rnd(-1, 1), 
        possessionChange: false, isGoal: false, isEvent: false, 
        logMessage: `${p} allonge le jeu.`, 
        customDuration: rnd(4, 6), 
        stats: { isPass: true, isSuccess: true } 
    }),
    'PASS_BACK': (t, p, h) => ({ 
        moveX: h ? -1 : 1, 
        moveY: rnd(-1, 1), 
        possessionChange: false, isGoal: false, isEvent: false, 
        logMessage: `${p} assure en retrait.`, 
        customDuration: 3, 
        stats: { isPass: true, isSuccess: true } 
    }),
    'PASS_SWITCH': (t, p, h, b) => ({ 
        moveX: 0, 
        moveY: b.y <= 2 ? 2 : -2, 
        possessionChange: false, isGoal: false, isEvent: false, 
        logMessage: `${p} renverse le jeu à l'opposé.`, 
        customDuration: 5, 
        stats: { isPass: true, isSuccess: true } 
    }),

    'DRIBBLE': (t, p, h) => ({ moveX: h ? 1 : -1, moveY: 0, possessionChange: false, isGoal: false, isEvent: false, logMessage: `${p} élimine son vis-à-vis !`, customDuration: 4, stats: { isDuel: true, isSuccess: true } }),
    'DRIBBLE_LOST': (t, p, h) => ({ moveX: 0, moveY: 0, possessionChange: true, isGoal: false, isEvent: false, logMessage: `${p} tente un dribble mais se fait subtiliser le ballon.`, customDuration: 3, stats: { isDuel: true, isSuccess: false } }),
    'CROSS': (t, p, h, b) => ({ moveX: h ? (4 - b.x) : -(b.x - 1), moveY: 2 - b.y, possessionChange: false, isGoal: false, isEvent: false, logMessage: `${p} adresse un centre dans la boîte.`, customDuration: rnd(4, 7), stats: { isPass: true, isSuccess: true, xg: 0.08 } }),
    'CUT_BACK': (t, p, h, b) => ({ moveX: 0, moveY: 2 - b.y, possessionChange: false, isGoal: false, isEvent: false, logMessage: `${p} centre en retrait !`, customDuration: 6, stats: { isPass: true, isSuccess: true, xg: 0.15 } }),
    'KEY_PASS': (t, p, h) => ({ moveX: h ? 1 : -1, moveY: 0, possessionChange: false, isGoal: false, isEvent: false, logMessage: `Superbe ouverture de ${p} !`, customDuration: 5, stats: { isPass: true, isSuccess: true, isChanceCreated: true } }),
    
    // Tirs
    'SHOOT_GOAL': (t, p) => ({ moveX: 0, moveY: 0, possessionChange: true, isGoal: true, isEvent: true, eventSubtype: 'GOAL', logMessage: `BUT !!! Frappe chirurgicale de ${p} !`, customDuration: 60, stats: { xg: 0.35 } }),
    'SHOOT_SAVED': (t, p) => ({ moveX: 0, moveY: 0, possessionChange: true, isGoal: false, isEvent: true, eventSubtype: 'SAVE', nextSituation: 'REBOUND_ZONE', logMessage: `Arrêt magistral sur cette frappe de ${p} !`, customDuration: 15, stats: { xg: 0.15 } }),
    'SHOOT_WOODWORK': (t, p) => ({ moveX: 0, moveY: 0, possessionChange: true, isGoal: false, isEvent: true, eventSubtype: 'WOODWORK', nextSituation: 'REBOUND_ZONE', logMessage: `LA BARRE ! La frappe de ${p} s'écrase sur le montant !`, customDuration: 10, stats: { xg: 0.20 } }),
    'SHOOT_OFF_TARGET': (t, p, h, b) => ({ moveX: h ? (5 - b.x) : -b.x, moveY: 2 - b.y, possessionChange: true, isGoal: false, isEvent: true, nextSituation: 'GOAL_KICK', logMessage: `La frappe de ${p} n'est pas cadrée.`, customDuration: 20, stats: { xg: 0.10 } }),
    'HEAD_SHOT': (t, p) => ({ moveX: 0, moveY: 0, possessionChange: true, isGoal: false, isEvent: true, eventSubtype: 'SHOT', nextSituation: 'REBOUND_ZONE', logMessage: `Tête puissante de ${p} !`, customDuration: 4, stats: { xg: 0.12 } }),
    
    'REBOUND': (t, p) => ({ moveX: 0, moveY: 0, possessionChange: false, isGoal: false, isEvent: false, logMessage: `${p} récupère le second ballon !`, customDuration: 3 }),

    // --- DEFENSE ---
    'TACKLE': (t, p) => ({ moveX: 0, moveY: 0, possessionChange: true, isGoal: false, isEvent: false, logMessage: `Superbe tacle de ${p}.`, customDuration: 4, stats: { isDuel: true, isSuccess: true } }),
    'INTERCEPT': (t, p) => ({ moveX: 0, moveY: 0, possessionChange: true, isGoal: false, isEvent: false, logMessage: `Interception de ${p} !`, customDuration: 3, stats: { isInterception: true, isDuel: true, isSuccess: true } }),
    'BLOCK': (t, p) => ({ moveX: 0, moveY: 0, possessionChange: true, isGoal: false, isEvent: false, logMessage: `Intervention décisive de ${p} !`, customDuration: 3, stats: { isDuel: true, isSuccess: true } }),
    'CLEARANCE': (t, p, h) => ({ moveX: h ? -2 : 2, moveY: rnd(-1, 1), possessionChange: true, isGoal: false, isEvent: false, logMessage: `${p} dégage le ballon loin devant.`, customDuration: 5 }),
    'SAVE': (t, p) => ({ moveX: 0, moveY: 0, possessionChange: true, isGoal: false, isEvent: true, eventSubtype: 'SAVE', nextSituation: 'REBOUND_ZONE', logMessage: `Parade de ${p} !`, customDuration: 10 }),
    'BALL_RECOVERY': (t, p) => ({ moveX: 0, moveY: 0, possessionChange: true, isGoal: false, isEvent: false, logMessage: `${p} récupère le cuir.`, customDuration: 3 }),

    // --- SITUATIONS ---
    'CORNER_GOAL': (t, p, h, b) => ({ moveX: h ? (4 - b.x) : -(b.x - 1), moveY: 2 - b.y, possessionChange: true, isGoal: true, isEvent: true, eventSubtype: 'GOAL', logMessage: `BUT SUR CORNER ! Tête de ${p} !`, customDuration: 60, stats: { xg: 0.18 } }),
    'CORNER_CLEARED': (t, p, h) => ({ moveX: h ? -2 : 2, moveY: rnd(-1, 1), possessionChange: true, isGoal: false, isEvent: false, logMessage: `Le corner est repoussé par la défense !`, customDuration: 5 }),
    'CORNER_SHORT': (t, p, h) => ({ moveX: 0, moveY: rnd(-1, 1), possessionChange: false, isGoal: false, isEvent: false, logMessage: `${p} joue le corner à deux.`, customDuration: 5 }),
    'CORNER_OVERCOOKED': (t, p, h, b) => ({ moveX: h ? (5 - b.x) : -b.x, moveY: 2 - b.y, possessionChange: true, isGoal: false, isEvent: false, nextSituation: 'GOAL_KICK', logMessage: `Le corner traverse la surface sans trouver preneur.`, customDuration: 10 }),
    'PUNCH': (t, p) => ({ moveX: 0, moveY: 0, possessionChange: true, isGoal: false, isEvent: true, eventSubtype: 'SAVE', logMessage: `Le gardien dégage du poing !`, customDuration: 5 }),
    'CLAIM': (t, p) => ({ moveX: 0, moveY: 0, possessionChange: true, isGoal: false, isEvent: true, eventSubtype: 'SAVE', logMessage: `Le gardien capte sereinement le ballon.`, customDuration: 10 }),

    // Penalties
    'PENALTY_GOAL': (t, p) => ({ moveX: 0, moveY: 0, possessionChange: true, isGoal: true, isEvent: true, eventSubtype: 'GOAL', logMessage: `${p} transforme son penalty !`, customDuration: 60, stats: { xg: 0.76 } }),
    'PENALTY_SAVED': (t, p) => ({ moveX: 0, moveY: 0, possessionChange: true, isGoal: false, isEvent: true, eventSubtype: 'SAVE', nextSituation: 'REBOUND_ZONE', logMessage: `ARRÊT DU GARDIEN sur le penalty de ${p} !`, customDuration: 15 }),
    'PENALTY_MISS': (t, p) => ({ moveX: 0, moveY: 0, possessionChange: true, isGoal: false, isEvent: true, nextSituation: 'GOAL_KICK', logMessage: `${p} envoie son penalty dans les nuages !`, customDuration: 20 }),
    
    // Goal Kicks
    'GK_SHORT': (t, p, h) => ({ moveX: h ? 1 : -1, moveY: rnd(-1, 1), possessionChange: false, isGoal: false, isEvent: false, logMessage: `Relance courte de ${p}.`, customDuration: 15 }),
    'GK_LONG': (t, p, h) => ({ moveX: h ? 3 : -3, moveY: rnd(-1, 1), possessionChange: false, isGoal: false, isEvent: false, logMessage: `Dégagement puissant de ${p}.`, customDuration: 20 }),
    'GK_BOULETTE': (t, p, h) => ({ moveX: 0, moveY: 0, possessionChange: true, isGoal: false, isEvent: true, logMessage: `INCROYABLE ! ${p} rate complètement sa relance !`, customDuration: 5 }),

    // Touches
    'THROW_IN_SAFE': (t, p, h) => ({ moveX: h ? 1 : -1, moveY: 0, possessionChange: false, isGoal: false, isEvent: false, logMessage: `${p} effectue une touche courte.`, customDuration: 5 }),
    'THROW_IN_LONG_BOX': (t, p, h) => ({ moveX: h ? 2 : -2, moveY: 0, possessionChange: false, isGoal: false, isEvent: false, logMessage: `Longue touche vers la surface !`, customDuration: 7 }),
    'THROW_IN_LOST': (t, p) => ({ moveX: 0, moveY: 0, possessionChange: true, isGoal: false, isEvent: false, logMessage: `Touche perdue par ${p}.`, customDuration: 5 }),

    // Coups Francs
    'FREE_KICK_CROSS': (t, p, h) => ({ moveX: h ? 2 : -2, moveY: 0, possessionChange: false, isGoal: false, isEvent: false, logMessage: `Coup franc envoyé dans la boîte.`, customDuration: 7 }),
    'FREE_KICK_WALL': (t, p) => ({ moveX: 0, moveY: 0, possessionChange: true, isGoal: false, isEvent: false, logMessage: `La frappe de ${p} s'écrase sur le mur !`, customDuration: 5 }),
    'FREE_KICK_SHOT': (t, p) => ({ moveX: 0, moveY: 0, possessionChange: true, isGoal: false, isEvent: true, eventSubtype: 'SHOT', logMessage: `Frappe directe sur coup franc de ${p} !`, customDuration: 7 }),

    // --- SYSTEM ---
    'NEUTRAL_POSSESSION': () => ({ moveX: rnd(-1, 1), moveY: rnd(-1, 1), possessionChange: true, isGoal: false, isEvent: false, logMessage: `Duel pour le ballon.`, customDuration: 5, stats: { isDuel: true, isSuccess: false } }),
    'SYSTEM': () => ({ moveX: 0, moveY: 0, possessionChange: false, isGoal: false, isEvent: false, logMessage: `...`, customDuration: 2 })
};
