import { Token, TokenExecutionResult, GridPosition } from "../types";

const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

export const TOKEN_LOGIC: Record<string, (token: Token, pName: string, isHome: boolean, ballPos: GridPosition) => TokenExecutionResult> = {
    
    // --- 1. CONSTRUCTION (PASSING) ---
    'PASS_SHORT': (t, p, h) => ({ 
        moveX: h ? 1 : -1, moveY: rnd(-1, 1), 
        isGoal: false, isEvent: false,
        logMessage: `${p} joue court.`, 
        customDuration: 4, 
        stats: { isPass: true, isSuccess: true } 
    }),

    'PASS_SHORT_TIRED': (t, p, h) => ({ 
        moveX: 0, moveY: 0, 
        isGoal: false, isEvent: false,
        turnover: true,
        logMessage: `${p}, trop court physiquement, rate sa transmission !`, 
        customDuration: 8,
    }),

    'PASS_SHORT_ELITE': (t, p, h) => ({ 
        moveX: h ? 2 : -2, moveY: 0, 
        isGoal: false, isEvent: false,
        logMessage: `Passe laser de ${p} qui casse les lignes !`, 
        customDuration: 4, 
        stats: { isPass: true, isSuccess: true, isChanceCreated: true } 
    }),

    'PASS_LATERAL': (t, p, h, b) => {
        // Correction de la logique de bordage pour moveY
        let moveY = (b.y <= 1) ? 1 : (b.y >= 3 ? -1 : (Math.random() > 0.5 ? 1 : -1));
        return {
            moveX: 0, moveY: moveY, 
            isGoal: false, isEvent: false,
            logMessage: `${p} écarte le jeu latéralement.`, 
            customDuration: 5, 
            stats: { isPass: true, isSuccess: true } 
        };
    },

    'PASS_THROUGH': (t, p, h) => ({
        moveX: h ? 2 : -2, moveY: 0,
        isGoal: false, isEvent: false,
        logMessage: `Magnifique passe en profondeur de ${p} !`, 
        customDuration: 5,
        stats: { isPass: true, isSuccess: true, isChanceCreated: true }
    }),

    // --- 2. FINITION (TIRS) ---
    'SHOOT_GOAL': (t, p, isHome) => ({ 
        moveX: 0, moveY: 0, 
        isGoal: true, isEvent: true, eventSubtype: 'GOAL', 
        logMessage: `BUT !!! Frappe chirurgicale de ${p} !`, 
        customDuration: 60, 
        nextSituation: isHome ? 'GOAL_HOME' : 'GOAL_AWAY'
    }),

    'SHOOT_GOAL_TIRED': (t, p, h) => ({ 
        moveX: 0, moveY: 0, 
        isGoal: false, isEvent: true, eventSubtype: 'SHOT',
        turnover: true,
        nextSituation: 'GOAL_KICK',
        logMessage: `${p} manque de lucidité et dévisse complètement son tir !`, 
        customDuration: 25, 
    }),

    // --- 3. DÉFENSE ---
    'TACKLE': (t, p) => ({ 
        moveX: 0, moveY: 0, 
        isGoal: false, isEvent: false,
        logMessage: `Intervention musclée et propre de ${p}.`, 
        customDuration: 3, 
        turnover: true 
    }),

    'TACKLE_TIRED': (t, p, h) => ({ 
        moveX: 0, moveY: 0, 
        isGoal: false, isEvent: true, eventSubtype: 'FOUL',
        turnover: true, 
        nextSituation: 'NORMAL', // Ou FREE_KICK si tu l'implémentes
        logMessage: `En retard, ${p} commet la faute !`, 
        customDuration: 20, 
    }),

    // --- 4. RELANCES ---
    'CLEARANCE': (t, p, h) => ({
        moveX: h ? 3 : -3, moveY: rnd(-1, 1),
        isGoal: false, isEvent: false,
        turnover: true, 
        logMessage: `${p} dégage le ballon loin devant pour donner de l'air.`,
        customDuration: 12 
    }),

    'GK_LONG': (t, p, h) => ({ 
        moveX: h ? 4 : -4, moveY: rnd(-1, 1), 
        isGoal: false, isEvent: false,
        nextSituation: 'NORMAL',
        logMessage: `Longue relance de ${p} qui cherche ses attaquants.`, 
        customDuration: 20 
    }),

    // --- 5. SYSTÈME ---
    'SYSTEM': () => ({ 
        moveX: 0, moveY: 0, isGoal: false, isEvent: false, 
        logMessage: `...`, customDuration: 2 
    }),
};