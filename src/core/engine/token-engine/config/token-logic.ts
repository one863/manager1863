
import { Token, TokenExecutionResult, GridPosition } from "../types";

const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

export const TOKEN_LOGIC: Record<string, (token: Token, pName: string, isHome: boolean, ballPos: GridPosition) => TokenExecutionResult> = {
        'CLEARANCE_KEEP': (t, p, h) => ({
            moveX: h ? 2 : -2,
            moveY: rnd(-1, 1),
            isGoal: false,
            isEvent: false,
            logMessage: `${p} dégage le ballon et trouve un coéquipier.`,
            customDuration: 5,
            nextSituation: undefined, // conserve la possession (utiliser une valeur existante si besoin)
            stats: { isClearance: true, isSuccess: true }
        }),

        'CLEARANCE_LOSE': (t, p, h) => ({
            moveX: h ? 2 : -2,
            moveY: rnd(-1, 1),
            isGoal: false,
            isEvent: false,
            logMessage: `${p} dégage le ballon mais l'adversaire récupère.`,
            customDuration: 5,
            nextSituation: undefined, // perd la possession (utiliser une valeur existante si besoin)
            stats: { isClearance: true, isSuccess: false }
        }),
    // --- 1. PROGRESSION (OFFENSE) ---
    'PASS_SHORT': (t, p, h) => ({ 
        moveX: h ? 1 : -1, moveY: rnd(-1, 1), 
        isGoal: false, isEvent: false, 
        logMessage: `${p} joue court.`, customDuration: rnd(2, 4), 
        stats: { isPass: true, isSuccess: true, position: t.position } 
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
    // --- CENTRE (CROSS) ---
    'CROSS': (t: Token, p: string, h: boolean, b: GridPosition) => {
        // Corner possible seulement si ballon dans la zone de but adverse
        const isCornerZone = (h && b.x === 5) || (!h && b.x === 0);
        const outcomes = [
            isCornerZone
                ? { log: `Centre tendu de ${p} repoussé... Corner !`, event: 'CORNER', turnover: false, stat: { isCross: true, isSuccess: false } }
                : { log: `Centre tendu de ${p} repoussé...`, event: undefined, turnover: true, stat: { isCross: true, isSuccess: false } },
            { log: `Centre de ${p} capté par le gardien.`, event: 'SAVE', turnover: true, stat: { isCross: true, isSuccess: false } },
            { log: `Centre de ${p} intercepté !`, event: undefined, turnover: true, stat: { isCross: true, isSuccess: false } },
            { log: `${p} trouve un partenaire dans la surface !`, event: undefined, turnover: false, stat: { isCross: true, isSuccess: true } }
        ];

        // 1. Calcul de moveX (déjà très bon dans ton code)
        let moveX = h ? Math.min(2, 5 - b.x) : Math.max(-2, 0 - b.x);
        if (h && b.x === 5) moveX = 0; // Sécurité
        if (!h && b.x === 0) moveX = 0;

        // 2. CORRECTION AXE Y : On vise toujours le centre (Y=2)
        // On calcule l'écart par rapport au centre et on s'en rapproche
        const targetY = 2;
        const diffY = targetY - b.y; 
        // moveY sera de +1, +2, -1 ou -2 pour converger vers la ligne 2
        let moveY = diffY > 0 ? rnd(1, 2) : (diffY < 0 ? rnd(-2, -1) : rnd(-1, 1));

        const o = outcomes[rnd(0, outcomes.length - 1)];

        return {
            moveX: moveX,
            moveY: moveY,
            isGoal: false,
            isEvent: true,
            eventSubtype: o.event as any,
            turnover: o.turnover, // Crucial pour que le gardien récupère le ballon
            nextSituation: o.event === 'CORNER' ? 'CORNER' : 'NORMAL',
            logMessage: o.log,
            customDuration: 6,
            stats: o.stat
        };
    },
   'PASS_SWITCH': (t, p, h, b) => {
    // 1. Calcul de la destination Y (On vise l'opposé)
    // Si on est à gauche (0,1), on va à droite (3,4) et inversement
    const targetY = b.y <= 1 ? rnd(3, 4) : rnd(0, 1);
    const moveY = targetY - b.y;

    // 2. Légère progression en X (1 case vers l'avant si possible)
    let moveX = h ? 1 : -1;
    // Sécurité pour ne pas sortir de la grille en X
    if ((h && b.x === 5) || (!h && b.x === 0)) moveX = 0;

    // Simplifié : réussite automatique
    return {
        moveX: moveX,
        moveY: moveY,
        isGoal: false,
        isEvent: false,
        turnover: false,
        logMessage: `${p} renverse superbement le jeu à l'opposé !`,
        customDuration: rnd(4, 6),
        stats: { isPass: true, isSuccess: true }
    };
},
    'DRIBBLE': (t, p, h) => ({ 
        moveX: h ? 1 : -1, moveY: rnd(-1, 1), 
        isGoal: false, isEvent: false, 
        logMessage: `${p} élimine son vis-à-vis !`, customDuration: 4, 
        stats: { isDuel: true, isSuccess: true } 
    }),

    // --- 2. FINITION (SHOTS) ---
    'SHOOT_GOAL': (t, p, isHome, ballPos) => ({ 
        moveX: 0, moveY: 0, 
        isGoal: true, isEvent: true, eventSubtype: 'GOAL', 
        logMessage: `BUT !!! Frappe chirurgicale de ${p} !`, customDuration: 60, 
        stats: { xg: 0.35 },
        nextSituation: isHome ? 'GOAL_HOME' : 'GOAL_AWAY'
    }),
    // Récupération sur tir cadré : le gardien capte
    'SHOOT_SAVED': (t, p, h, b) => ({ 
                moveX: 0, moveY: 0, 
                isGoal: false, isEvent: true, eventSubtype: 'SAVE', 
                turnover: false,
                nextSituation: 'GOAL_KICK',
                logMessage: `Arrêt du gardien sur la frappe de ${p} !`, customDuration: 5, 
                stats: { xg: 0.15 },
                overrideBallPosition: h ? { x: 0, y: 2 } : { x: 5, y: 2 }
        }),
    // Arrêt dévié en corner
    'SHOOT_SAVED_CORNER': (t, p, h, b) => ({
        moveX: 0, moveY: 0,
        isGoal: false, isEvent: true, eventSubtype: 'CORNER',
        nextSituation: 'CORNER',
        logMessage: `Arrêt réflexe de ${p}... et corner !`, customDuration: 7,
        stats: { isDuel: true, isSuccess: true, isCorner: true }
    }),
    // Tir non cadré : 6 mètres adverse
    'SHOOT_OFF_TARGET': (t, p, h, b) => ({ 
        moveX: 0, moveY: 0, 
        isGoal: false, isEvent: true, 
        turnover: true,
        nextSituation: 'GOAL_KICK',
        logMessage: `Frappe de ${p} à côté du cadre. Six mètres.`, customDuration: 10, 
        stats: { xg: 0.10 } 
    }),
    'SHOOT_WOODWORK': (t, p, h, b) => ({
        moveX: 0, moveY: 0,
        isGoal: false, isEvent: true, eventSubtype: 'WOODWORK',
        nextSituation: 'REBOUND_ZONE',
        // Ajout : le ballon va en zone 5,2 (home) ou 0,2 (away)
        overrideBallPosition: h ? { x: 5, y: 2 } : { x: 0, y: 2 },
        logMessage: `LA BARRE ! La frappe de ${p} s'écrase sur le montant !`, customDuration: 10,
        stats: { xg: 0.20 }
    }),
    // Tir sur le poteau/barre qui sort en 6 mètres
    'WOODWORK_OUT': (t, p, h, b) => ({
        moveX: 0, moveY: 0,
        isGoal: false, isEvent: true, eventSubtype: 'WOODWORK',
        turnover: true,
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
        moveX: h ? 2 : -2, moveY: rnd(-1, 1), 
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
        nextSituation: 'NORMAL',
        logMessage: `Le GK s\'empare du ballon puis effectue une relance courte.`, customDuration: 10 
    }),
    'GK_LONG': (t, p, h) => ({ 
        moveX: h ? 3 : -3, moveY: rnd(-1, 1), 
        isGoal: false, isEvent: false, 
        nextSituation: 'NORMAL',
        logMessage: `Le GK s\'empare du ballon puis effectue une relance longue.`, customDuration: 15 
    }),

    // --- 5. COUPS DE PIED ARRÊTÉS ---
    'CORNER_GOAL': (t, p, h, b) => ({ 
        moveX: h ? (4 - b.x) : -(b.x - 1), moveY: 2 - b.y, 
        isGoal: true, isEvent: true, eventSubtype: 'GOAL', 
        logMessage: `BUT SUR CORNER ! Tête de ${p} !`, customDuration: 60, 
        stats: { xg: 0.18 } 
    }),
    // Récupération sur corner trop long : possession perdue
    'CORNER_OVERCOOKED': (t, p, h, b) => ({ 
        moveX: 0, moveY: 0, 
        isGoal: false, isEvent: false, 
        turnover: true,
        logMessage: `Corner trop long de ${p}, récupération adverse.`, customDuration: 10 
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
        nextSituation: 'NORMAL',
        logMessage: `${p} tire le coup franc depuis l'aile.`, customDuration: 10,
        stats: { isPass: true }
    }),

    // --- JETONS AVEC TURNOVER (changement de possession) ---
    'THROW_IN_LOST': (t, p, h) => ({ 
        moveX: 0, moveY: 0, 
        isGoal: false, isEvent: false, 
        turnover: true,
        logMessage: `Touche perdue par ${p} !`, customDuration: 5 
    }),
    'THROW_IN_LONG_BOX': (t, p, h) => ({ 
        moveX: h ? 3 : -3, moveY: 0, 
        isGoal: false, isEvent: false, 
        logMessage: `Longue touche de ${p} vers la surface !`, customDuration: 8 
    }),
    'CORNER_CLEARED': (t, p, h) => ({ 
        moveX: h ? 2 : -2, moveY: rnd(-1, 1), 
        isGoal: false, isEvent: false, 
        turnover: true,
        logMessage: `Corner dégagé par ${p}.`, customDuration: 6 
    }),
    'CORNER_SHORT': (t, p, h) => ({ 
        moveX: h ? 1 : -1, moveY: 0, 
        isGoal: false, isEvent: false, 
        logMessage: `${p} joue le corner à court.`, customDuration: 5,
        stats: { isPass: true, isSuccess: true }
    }),
    'PENALTY_SAVED': (t, p) => ({ 
        moveX: 0, moveY: 0, 
        isGoal: false, isEvent: true, eventSubtype: 'SAVE', 
        turnover: true,
        nextSituation: 'NORMAL',
        logMessage: `Penalty arrêté par ${p} !`, customDuration: 15 
    }),
    'PENALTY_MISS': (t, p) => ({ 
        moveX: 0, moveY: 0, 
        isGoal: false, isEvent: true, 
        turnover: true,
        nextSituation: 'GOAL_KICK',
        logMessage: `${p} manque son penalty !`, customDuration: 15,
        stats: { xg: 0.76 }
    }),
    'FREE_KICK_SHOT': (t, p) => ({ 
        moveX: 0, moveY: 0, 
        isGoal: false, isEvent: true, eventSubtype: 'SHOT', 
        logMessage: `Frappe de ${p} sur coup franc !`, customDuration: 8,
        stats: { xg: 0.08 }
    }),
    'FREE_KICK_CROSS': (t, p, h) => ({ 
        moveX: h ? 2 : -2, moveY: rnd(-1, 1), 
        isGoal: false, isEvent: false, 
        logMessage: `Centre sur coup franc de ${p}.`, customDuration: 6,
        stats: { isPass: true }
    }),
    'FREE_KICK_WALL': (t, p) => ({ 
        moveX: 0, moveY: 0, 
        isGoal: false, isEvent: false, 
        turnover: true,
        logMessage: `Le coup franc de ${p} s'écrase dans le mur !`, customDuration: 6 
    }),
    'BALL_RECOVERY': (t, p) => ({ 
        moveX: 0, moveY: 0, 
        isGoal: false, isEvent: false, 
        logMessage: `Récupération de balle par ${p}.`, customDuration: 4,
        stats: { isInterception: true }
    }),
    'BLOCK': (t, p) => ({ 
        moveX: 0, moveY: 0, 
        isGoal: false, isEvent: false, 
        logMessage: `Contre attaque de ${p} !`, customDuration: 4,
        stats: { isDuel: true, isSuccess: true }
    }),
    'DUEL_WON': (t, p) => ({ 
        moveX: 0, moveY: 0, 
        isGoal: false, isEvent: false, 
        logMessage: `${p} remporte son duel.`, customDuration: 4,
        stats: { isDuel: true, isSuccess: true }
    }),
    'DUEL_LOST': (t, p) => ({ 
        moveX: 0, moveY: 0, 
        isGoal: false, isEvent: false, 
        turnover: true,
        logMessage: `${p} perd son duel.`, customDuration: 4,
        stats: { isDuel: true, isSuccess: false }
    }),
    'PRESS': (t, p) => ({ 
        moveX: 0, moveY: 0, 
        isGoal: false, isEvent: false, 
        logMessage: `Pressing réussi de ${p} !`, customDuration: 3,
        stats: { isDuel: true, isSuccess: true }
    }),
    'ERROR': (t, p) => ({ 
        moveX: 0, moveY: 0, 
        isGoal: false, isEvent: false, 
        turnover: true,
        logMessage: `Erreur technique de ${p} !`, customDuration: 3 
    }),

    // ============================================
    // CARTONS SPÉCIFIQUES
    // ============================================
    'YELLOW_CARD': (t, p, h, b) => ({
        moveX: 0, moveY: 0,
        isGoal: false, isEvent: true, eventSubtype: 'CARD',
        nextSituation: 'FREE_KICK',
        turnover: true,
        logMessage: `Carton jaune pour ${p} ! L'arbitre a sorti le bristol.`, 
        customDuration: 15,
        stats: { isDuel: true }
    }),
    'RED_CARD': (t, p, h, b) => ({
        moveX: 0, moveY: 0,
        isGoal: false, isEvent: true, eventSubtype: 'CARD',
        nextSituation: 'FREE_KICK',
        turnover: true,
        logMessage: `CARTON ROUGE ! ${p} est exclu ! Son équipe finira à 10 !`, 
        customDuration: 35,
        stats: { isDuel: true }
    }),
    'SECOND_YELLOW_CARD': (t, p, h, b) => ({
        moveX: 0, moveY: 0,
        isGoal: false, isEvent: true, eventSubtype: 'CARD',
        nextSituation: 'FREE_KICK',
        turnover: true,
        logMessage: `Deuxième jaune pour ${p} ! C'est le rouge ! Expulsion !`, 
        customDuration: 50,
        stats: { isDuel: true }
    }),

    // ============================================
    // BLESSURES
    // ============================================
    'INJURY': (t, p, h, b) => ({
        moveX: 0, moveY: 0,
        isGoal: false, isEvent: true, eventSubtype: 'INJURY',
        logMessage: `${p} reste au sol... L'arbitre arrête le jeu.`, 
        customDuration: 45,
        stats: {}
    }),
    'STRETCHER': (t, p, h, b) => ({
        moveX: 0, moveY: 0,
        isGoal: false, isEvent: true, eventSubtype: 'INJURY',
        logMessage: `La civière entre sur le terrain pour ${p}. Cela semble sérieux.`, 
        customDuration: 120,
        stats: {}
    }),

    // ============================================
    // VAR ET SITUATIONS SPÉCIALES
    // ============================================
    'VAR_CHECK': (t, p, h, b) => ({
        moveX: 0, moveY: 0,
        isGoal: false, isEvent: true, eventSubtype: 'VAR',
        nextSituation: 'VAR_ZONE',
        logMessage: `L'arbitre porte la main à son oreillette... Vérification VAR !`, 
        customDuration: 75,
        stats: {}
    }),
    'STALEMATE': (t, p, h, b) => ({
        moveX: 0, moveY: 0,
        isGoal: false, isEvent: false,
        logMessage: `Duel pour le ballon sans vainqueur.`, 
        customDuration: 5,
        stats: {}
    }),
    'ADDED_TIME': (t, p, h, b) => ({
        moveX: 0, moveY: 0,
        isGoal: false, isEvent: true,
        logMessage: `Le quatrième arbitre annonce le temps additionnel.`, 
        customDuration: 5,
        stats: {}
    }),

    // ============================================
    // ACTIONS DE TÊTE
    // ============================================
    'HEAD_PASS': (t, p, h) => ({
        moveX: h ? 1 : -1, moveY: rnd(-1, 1),
        isGoal: false, isEvent: false,
        logMessage: `${p} dévie de la tête.`, 
        customDuration: 3,
        stats: { isPass: true, isSuccess: true }
    }),
    'HEAD_SHOT': (t, p) => ({
        moveX: 0, moveY: 0,
        isGoal: false, isEvent: true, eventSubtype: 'SHOT',
        logMessage: `Tête de ${p} !`, 
        customDuration: 5,
        stats: { xg: 0.12 }
    }),
    'OWN_GOAL': (t, p, h, b) => ({
        moveX: 0, moveY: 0,
        isGoal: true, isEvent: true, eventSubtype: 'GOAL',
        logMessage: `BUT CONTRE SON CAMP ! ${p} trompe son propre gardien !`, 
        customDuration: 60,
        stats: { xg: 0 }
    }),

    // ============================================
    // GARDIEN SPÉCIAL
    // ============================================
    'SAVE': (t, p) => ({
        moveX: 0, moveY: 0,
        isGoal: false, isEvent: true, eventSubtype: 'SAVE',
        turnover: true,
        logMessage: `Arrêt de ${p} !`, 
        customDuration: 8,
        stats: { isDuel: true, isSuccess: true }
    }),
    'SWEEPER_KEEPER': (t, p, h) => ({
        moveX: h ? 2 : -2, moveY: 0,
        isGoal: false, isEvent: false,
        logMessage: `Sortie loin de ses buts de ${p} ! Il dégage le danger.`, 
        customDuration: 6,
        stats: { isDuel: true, isSuccess: true }
    }),

    // ============================================
    // PASSES SPÉCIALES
    // ============================================
    'THROUGH_BALL': (t, p, h) => ({
        moveX: h ? 2 : -2, moveY: 0,
        isGoal: false, isEvent: false,
        logMessage: `Passe en profondeur de ${p} !`, 
        customDuration: 4,
        stats: { isPass: true, isSuccess: true, isChanceCreated: true }
    }),
    // KEY_PASS supprimé (doublon de THROUGH_BALL)
    'CUT_BACK': (t, p, h) => ({
        moveX: h ? -1 : 1, moveY: rnd(-1, 1), // Retrait vers le centre du terrain
        isGoal: false, isEvent: false,
        logMessage: `${p} joue en retrait !`, 
        customDuration: 3,
        stats: { isPass: true, isSuccess: true, isChanceCreated: true }
    }),
    'PASS_ONETWO': (t, p, h) => ({
        moveX: h ? 1 : -1, moveY: 0,
        isGoal: false, isEvent: false,
        logMessage: `Une-deux avec ${p} !`, 
        customDuration: 4,
        stats: { isPass: true, isSuccess: true }
    }),

    // ============================================
    // OFFSIDE
    // ============================================
    'OFFSIDE': (t, p, h, b) => ({
        moveX: 0, moveY: 0,
        isGoal: false, isEvent: true,
        turnover: true,
        logMessage: `Position de hors-jeu signalée sur ${p}.`, 
        customDuration: 8,
        stats: {}
    }),

    // ============================================
    // FAUTES AVEC PÉNALTY
    // ============================================
    'FOUL_PENALTY': (t, p, h, b) => ({
        moveX: 0, moveY: 0,
        isGoal: false, isEvent: true, eventSubtype: 'PENALTY',
        nextSituation: 'PENALTY',
        turnover: true,
        logMessage: `Faute dans la surface de ${p} ! PENALTY !`, 
        customDuration: 25,
        stats: { isDuel: true }
    }),

    // ============================================
    // FATIGUE (Jeton système)
    // ============================================
    'FATIGUE': (t, p) => ({
        moveX: 0, moveY: 0,
        isGoal: false, isEvent: false,
        logMessage: `${p} accuse le coup, la fatigue se fait sentir.`, 
        customDuration: 5,
        stats: {}
    })
};
