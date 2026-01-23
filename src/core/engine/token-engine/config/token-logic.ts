import { Token, TokenExecutionResult } from "../types";

export const TOKEN_LOGIC: Record<string, (token: Token, playerName: string, isHome: boolean) => TokenExecutionResult> = {
    'PASS': (token, pName, isHome) => {
        const success = Math.random() < (token.quality / 100) + 0.2;
        return {
            moveX: success ? (isHome ? 1 : -1) : 0,
            moveY: success ? (Math.random() > 0.5 ? 1 : -1) : 0,
            possessionChange: !success,
            isGoal: false,
            isEvent: false,
            logMessage: success ? `${pName} réussit sa passe` : `${pName} rate sa passe`
        };
    },
    'COMBO_PASS': (token, pName, isHome) => {
        const success = Math.random() < (token.quality / 100);
        return {
            moveX: success ? (isHome ? 2 : -2) : 0,
            moveY: 0,
            possessionChange: !success,
            isGoal: false,
            isEvent: false,
            logMessage: success ? `${pName} lance une combinaison rapide` : `${pName} perd le ballon sur une remise`
        };
    },
    'DRIBBLE': (token, pName, isHome) => {
        const success = Math.random() < (token.quality / 100) + 0.1;
        return {
            moveX: success ? (isHome ? 1 : -1) : 0,
            moveY: 0,
            possessionChange: !success,
            isGoal: false,
            isEvent: false,
            logMessage: success ? `${pName} élimine son vis-à-vis` : `${pName} se fait chiper le ballon`
        };
    },
    'SHOOT': (token, pName, isHome) => {
        const goalChance = (token.quality / 200) + 0.1;
        const isGoal = Math.random() < goalChance;
        return {
            moveX: 0,
            moveY: 0,
            possessionChange: true,
            isGoal: isGoal,
            isEvent: true,
            eventSubtype: isGoal ? 'GOAL' : 'SHOT',
            logMessage: isGoal ? `${pName} MARQUE !` : `${pName} tente sa chance mais échoue`
        };
    },
    'TACKLE': (token, pName, isHome) => {
        const success = Math.random() < (token.quality / 100) + 0.3;
        return {
            moveX: 0,
            moveY: 0,
            possessionChange: success,
            isGoal: false,
            isEvent: false,
            logMessage: success ? `${pName} récupère le ballon par un tacle` : `${pName} rate son tacle`
        };
    },
    'INTERCEPT': (token, pName, isHome) => {
        const success = Math.random() < (token.quality / 100) + 0.2;
        return {
            moveX: 0,
            moveY: 0,
            possessionChange: success,
            isGoal: false,
            isEvent: false,
            logMessage: success ? `${pName} intercepte la trajectoire` : `${pName} manque l'interception`
        };
    },
    'ERROR': (token, pName, isHome) => ({
        moveX: 0,
        moveY: 0,
        possessionChange: true,
        isGoal: false,
        isEvent: false,
        logMessage: `${pName} commet une erreur technique`
    }),
    'NEUTRAL_POSSESSION': (token, pName, isHome) => ({
        moveX: 0,
        moveY: 0,
        possessionChange: Math.random() > 0.5,
        isGoal: false,
        isEvent: false,
        logMessage: `Le ballon est disputé`
    }),
    'FATIGUE': (token, pName, isHome) => ({
        moveX: 0,
        moveY: 0,
        possessionChange: false,
        isGoal: false,
        isEvent: false,
        logMessage: `${pName} semble fatigué`
    }),
    'SAVE': (token, pName, isHome) => ({
        moveX: isHome ? 1 : -1,
        moveY: 0,
        possessionChange: true,
        isGoal: false,
        isEvent: false,
        logMessage: `Le gardien s'interpose et relance`
    }),
    'SYSTEM': (token, pName, isHome) => ({
        moveX: 0,
        moveY: 0,
        possessionChange: false,
        isGoal: false,
        isEvent: false,
        logMessage: `...`
    })
};
