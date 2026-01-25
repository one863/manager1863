import { Token, TokenExecutionResult, GridPosition } from "../types";

const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

export const TOKEN_LOGIC: Record<string, (token: Token, pName: string, isHome: boolean, ballPos: GridPosition) => TokenExecutionResult> = {
    // --- 1. PROGRESSION (OFFENSE) ---
    'PASS_SHORT': (t, p, h) => ({ 
        moveX: h ? 1 : -1, moveY: rnd(-1, 1), 
        isGoal: false, isEvent: false, 
        logMessage: `${p} joue court.`, customDuration: rnd(2, 4), 
        stats: { isPass: true, isSuccess: true } 
    }),
    'PASS_LONG': (t, p, h) => ({ 
        moveX: h ? 2 : -2, moveY: rnd(-1, 1), 
        isGoal: false, isEvent: false, 
        logMessage: `${p} allonge le jeu.`, customDuration: rnd(4, 6), 
        stats: { isPass: true, isSuccess: true } 
    }),
    'PASS_BACK': (t, p, h) => ({ 
        moveX: h ? -1 : 1, moveY: rnd(-1, 1), 
        isGoal: false, isEvent: false, 
        logMessage: `${p} assure en retrait.`, customDuration: 3, 
        stats: { isPass: true, isSuccess: true } 
    }),
    // (définition dupliquée supprimée)
    // --- CENTRE (CROSS) ---
    'CROSS': (t: Token, p: string, h: boolean, b: GridPosition) => {
        // Narration enrichie et issues variées
            type CrossEvent = 'CORNER' | 'SAVE' | 'GOAL' | 'FOUL' | 'CARD' | 'SHOT' | 'INJURY' | 'PENALTY' | 'WOODWORK' | 'VAR' | undefined;
            const outcomes: { log: string; event: CrossEvent; stat: { isCross: boolean; isSuccess: boolean } }[] = [
                { log: `Centre tendu de ${p} repoussé par la défense !`, event: 'CORNER', stat: { isCross: true, isSuccess: false } },
                { log: `Centre de ${p} capté par le gardien.`, event: 'SAVE', stat: { isCross: true, isSuccess: false } },
                { log: `Centre de ${p} intercepté !`, event: undefined, stat: { isCross: true, isSuccess: false } },
                { log: `${p} trouve un partenaire dans la surface !`, event: undefined, stat: { isCross: true, isSuccess: true } }
            ];
        const idx = rnd(0, outcomes.length - 1);
        const o = outcomes[idx];
        return {
            moveX: h ? Math.max(1, 5 - b.x) : -Math.max(1, b.x),
            moveY: rnd(-1, 1),
            isGoal: false, isEvent: true,
            eventSubtype: o.event,
            logMessage: o.log,
            customDuration: 6,
            stats: o.stat
        };
    },
    'PASS_SWITCH': (t, p, h, b) => ({ 
        moveX: 0, moveY: b.y <= 2 ? 2 : -2, 
        isGoal: false, isEvent: false, 
        logMessage: `${p} renverse le jeu.`, customDuration: 5, 
        stats: { isPass: true, isSuccess: true } 
    }),
    'DRIBBLE': (t, p, h) => ({ 
        moveX: h ? 1 : -1, moveY: 0, 
        isGoal: false, isEvent: false, 
        logMessage: `${p} élimine son vis-à-vis !`, customDuration: 4, 
        stats: { isDuel: true, isSuccess: true } 
    }),

    // --- 2. FINITION (SHOTS) ---
    'SHOOT_GOAL': (t, p) => ({ 
        moveX: 0, moveY: 0, 
        isGoal: true, isEvent: true, eventSubtype: 'GOAL', 
        logMessage: `BUT !!! Frappe chirurgicale de ${p} !`, customDuration: 60, 
        stats: { xg: 0.35 } 
    }),
    // Récupération sur tir cadré : DUEL_WON adverse
    'SHOOT_SAVED': (t, p, h, b) => ({ 
        moveX: 0, moveY: 0, 
        isGoal: false, isEvent: true, eventSubtype: 'SAVE', 
        logMessage: `Duel remporté par le gardien adverse sur la frappe de ${p} !`, customDuration: 5, 
        stats: { isDuel: true, isSuccess: true } 
    }),
    // Arrêt dévié en corner
    'SHOOT_SAVED_CORNER': (t, p, h, b) => ({
        moveX: 0, moveY: 0,
        isGoal: false, isEvent: true, eventSubtype: 'CORNER',
        nextSituation: 'CORNER',
        logMessage: `Arrêt réflexe de ${p}... et corner !`, customDuration: 7,
        stats: { isDuel: true, isSuccess: true, isCorner: true }
    }),
    // Récupération sur tir non cadré : DUEL_WON adverse
    'SHOOT_OFF_TARGET': (t, p, h, b) => ({ 
        moveX: 0, moveY: 0, 
        isGoal: false, isEvent: true, 
        logMessage: `Duel remporté par la défense adverse sur la frappe non cadrée de ${p}.`, customDuration: 10, 
        stats: { isDuel: true, isSuccess: true, xg: 0.10 } 
    }),
    'SHOOT_WOODWORK': (t, p) => ({ 
        moveX: 0, moveY: 0, 
        isGoal: false, isEvent: true, eventSubtype: 'WOODWORK', 
        nextSituation: 'REBOUND_ZONE', 
        logMessage: `LA BARRE ! La frappe de ${p} s'écrase sur le montant !`, customDuration: 10, 
        stats: { xg: 0.20 } 
    }),
    // Tir sur le poteau/barre qui sort en 6 mètres
    'WOODWORK_OUT': (t, p, h, b) => ({
        moveX: 0, moveY: 0,
        isGoal: false, isEvent: true, eventSubtype: 'WOODWORK',
        nextSituation: 'GOAL_KICK',
        logMessage: `La frappe de ${p} touche le montant et sort ! Six mètres.`, customDuration: 8,
        stats: { xg: 0.18 }
    }),

    // --- 3. DÉFENSE ---
    'TACKLE': (t, p) => ({ 
        moveX: 0, moveY: 0, 
        isGoal: false, isEvent: false, 
        logMessage: `Superbe tacle de ${p}.`, customDuration: 4, 
        stats: { isDuel: true, isSuccess: true } 
    }),
    'INTERCEPT': (t, p) => ({ 
        moveX: 0, moveY: 0, 
        isGoal: false, isEvent: false, 
        logMessage: `Interception de ${p} !`, customDuration: 3, 
        stats: { isInterception: true, isDuel: true, isSuccess: true } 
    }),
    'CLEARANCE': (t, p, h) => ({ 
        moveX: h ? -2 : 2, moveY: rnd(-1, 1), 
        isGoal: false, isEvent: false, 
        logMessage: `${p} dégage le ballon loin devant.`, customDuration: 5 
    }),

    // --- 4. GARDIEN (GK) ---
    'GK_POSSESSION': (t, p) => ({ 
        moveX: 0, moveY: 0, 
        isGoal: false, isEvent: false, 
        logMessage: `${p} capte le ballon et s'apprête à relancer.`, customDuration: 8 
    }),
    'CLAIM': (t, p, h, b) => ({ 
        moveX: h ? (5 - b.x) : -b.x, moveY: 2 - b.y, 
        isGoal: false, isEvent: true, eventSubtype: 'SAVE', 
        nextSituation: 'NORMAL',
        logMessage: `Le gardien capte sereinement le ballon.`, customDuration: 10 
    }),
    'PUNCH': (t, p, h) => ({ 
        moveX: h ? -1 : 1, moveY: rnd(-1, 1), 
        isGoal: false, isEvent: true, eventSubtype: 'SAVE', 
        logMessage: `Le gardien dégage du poing !`, customDuration: 5 
    }),
    'GK_SHORT': (t, p, h) => ({ 
        moveX: h ? 1 : -1, moveY: rnd(-1, 1), 
        isGoal: false, isEvent: false, 
        logMessage: `Relance courte de ${p}.`, customDuration: 10 
    }),
    'GK_LONG': (t, p, h) => ({ 
        moveX: h ? 3 : -3, moveY: rnd(-1, 1), 
        isGoal: false, isEvent: false, 
        logMessage: `Dégagement puissant de ${p}.`, customDuration: 15 
    }),

    // --- 5. COUPS DE PIED ARRÊTÉS ---
    'CORNER_GOAL': (t, p, h, b) => ({ 
        moveX: h ? (4 - b.x) : -(b.x - 1), moveY: 2 - b.y, 
        isGoal: true, isEvent: true, eventSubtype: 'GOAL', 
        logMessage: `BUT SUR CORNER ! Tête de ${p} !`, customDuration: 60, 
        stats: { xg: 0.18 } 
    }),
    // Récupération sur corner trop long : DUEL_WON adverse
    'CORNER_OVERCOOKED': (t, p, h, b) => ({ 
        moveX: 0, moveY: 0, 
        isGoal: false, isEvent: false, 
        logMessage: `Duel remporté par la défense adverse sur le corner de ${p}.`, customDuration: 10 
    }),
    'PENALTY_GOAL': (t, p) => ({ 
        moveX: 0, moveY: 0, 
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
        moveX: 0, moveY: 0, 
        isGoal: false, isEvent: false, 
        logMessage: `${p} récupère le second ballon !`, customDuration: 3 
    }),
    'NEUTRAL_POSSESSION': () => ({ 
        moveX: rnd(-1, 1), moveY: rnd(-1, 1), 
        isGoal: false, isEvent: false, 
        logMessage: `Duel pour le ballon.`, customDuration: 5 
    }),
    'SYSTEM': () => ({ moveX: 0, moveY: 0, isGoal: false, isEvent: false, logMessage: `...`, customDuration: 2 }),

    // --- FAUTE, CARTON, COUP FRANC ---
    'FOUL': (t: Token, p: string, h: boolean, b: GridPosition) => ({
        moveX: 0, moveY: 0,
        isGoal: false, isEvent: true, eventSubtype: 'FOUL',
        logMessage: `Faute de ${p} sur l'aile. Coup franc à suivre.`, customDuration: 8,
        stats: { isDuel: true }
    }),
    'CARD': (t: Token, p: string, h: boolean, b: GridPosition) => ({
        moveX: 0, moveY: 0,
        isGoal: false, isEvent: true, eventSubtype: 'CARD',
        logMessage: `Carton pour ${p} après une faute sur l'aile.`, customDuration: 10,
        stats: { isDuel: true }
    }),
    'FREE_KICK': (t: Token, p: string, h: boolean, b: GridPosition) => ({
        moveX: h ? 1 : -1, moveY: rnd(-1, 1),
        isGoal: false, isEvent: true, eventSubtype: 'FOUL',
        logMessage: `${p} tire le coup franc depuis l'aile.`, customDuration: 10,
        stats: { isPass: true }
    })
};
