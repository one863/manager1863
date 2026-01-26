import { Token, TokenType, ZoneDefinition } from "../types";

/**
 * Configuration des zones de la grille 6x5
 * 
 * ORIENTATION:
 *   x=0 → But HOME (home défend ici)
 *   x=5 → But AWAY (away défend ici)
 *   y=0, y=4 → Ailes (flancs gauche/droit)
 *   y=1, y=2, y=3 → Axe central
 * 
 * HOME attaque vers x=5, AWAY attaque vers x=0
 * 
 * CROSS: Uniquement depuis les ailes avancées (y=0 ou y=4) ET x=3,4 pour HOME / x=1,2 pour AWAY
 */

const sys = (type: TokenType, count: number = 1, quality: number = 30): Partial<Token>[] => 
    Array(Math.floor(count)).fill({ type, quality, duration: 5 });

// ============================================
// HELPER: Jetons par type de zone
// ============================================

// Jetons pour zones d'aile avec possibilité de centre (zones avancées uniquement)
const wingTokensWithCross = () => [
    ...sys('DRIBBLE', 3),
    ...sys('PASS_SHORT', 2),
    ...sys('CROSS', 5),           // Centres depuis les ailes avancées
    ...sys('CUT_BACK', 2),        // Centre en retrait
    ...sys('INTERCEPT', 2),
    ...sys('TACKLE', 1)
];

// Jetons pour zones d'aile défensive (pas de centre)
const wingTokensDefensive = () => [
    ...sys('DRIBBLE', 2),
    ...sys('PASS_SHORT', 3),
    ...sys('PASS_LONG', 2),
    ...sys('CLEARANCE', 2),
    ...sys('INTERCEPT', 3),
    ...sys('TACKLE', 2),
    ...sys('THROW_IN_SAFE', 1)
];

// Jetons pour zones d'aile médiane (construction, pas de centre)
const wingTokensMidfield = () => [
    ...sys('DRIBBLE', 2),
    ...sys('PASS_SHORT', 3),
    ...sys('PASS_LONG', 2),
    ...sys('PASS_SWITCH', 1),
    ...sys('INTERCEPT', 2),
    ...sys('TACKLE', 1),
    ...sys('THROW_IN_SAFE', 1)
];

// Jetons pour axe central (construction) - PAS de clearance (ajouté manuellement en zone défensive)
const centralBuildUp = () => [
    ...sys('PASS_SHORT', 4),
    ...sys('PASS_LONG', 2),
    ...sys('PASS_BACK', 2),
    ...sys('PASS_SWITCH', 1),
    ...sys('INTERCEPT', 2),
    ...sys('TACKLE', 1)
];

// Jetons pour axe central offensif
const centralOffensive = () => [
    ...sys('PASS_SHORT', 3),
    ...sys('THROUGH_BALL', 3),
    ...sys('DRIBBLE', 2),
    ...sys('INTERCEPT', 2)
];

// Jetons pour entrée de surface (zone chaude) - PAS de clearance ici
const boxEntrance = () => [
    ...sys('PASS_SHORT', 2),
    ...sys('THROUGH_BALL', 4),
    ...sys('DRIBBLE', 2),
    ...sys('SHOOT_OFF_TARGET', 2),  // Tirs de loin
    ...sys('INTERCEPT', 2),
    ...sys('BLOCK', 1),
    ...sys('FOUL', 1)  // Fautes possibles sur pressing
];

// Jetons pour surface (finition) - BOOST OFFENSIF pour plus de buts
const boxTokens = (central: boolean = false) => [
    ...sys('SHOOT_GOAL', central ? 20 : 15, 40),  // Augmenté + qualité haute
    ...sys('SHOOT_SAVED', 3, 15),                  // Réduit + qualité basse
    ...sys('SHOOT_SAVED_CORNER', 2, 15),
    ...sys('SHOOT_OFF_TARGET', 3, 15),             // Réduit
    ...sys('SHOOT_WOODWORK', 1, 20),
    ...sys('WOODWORK_OUT', 1, 15),
    ...sys('HEAD_SHOT', 4, 30),                    // Augmenté
    // Défense dans la surface : très risqué !
    ...sys('TACKLE', 1, 20),       // Qualité réduite
    ...sys('BLOCK', 3, 25),        // Réduit
    ...sys('INTERCEPT', 1, 20),    // Réduit
    ...sys('FOUL_PENALTY', 2, 25)  // Penalty sur tackle raté
];

// Jetons pour surface défensive (équipe qui défend) - avec CLEARANCE (réduit)
const boxTokensDefensive = () => [
    ...sys('CLEARANCE', 2, 25),    // Réduit
    ...sys('BLOCK', 2, 25),        // Réduit
    ...sys('INTERCEPT', 1, 20),    // Réduit
    ...sys('TACKLE', 1, 15),       // Très peu de tackles (risque penalty)
    ...sys('FOUL_PENALTY', 2, 25), // Conséquence du tackle raté
    ...sys('GK_SHORT', 1, 20),
    ...sys('GK_LONG', 1, 20)
];

// Jetons pour zone du gardien (relance)
const gkZone = () => [
    ...sys('GK_SHORT', 4),
    ...sys('GK_LONG', 4),
    ...sys('CLEARANCE', 3),        // Le gardien peut dégager
    ...sys('GK_BOULETTE', 1)
];

export const ZONES_CONFIG: Record<string, ZoneDefinition> = {
    // ============================================
    // SURFACE HOME (x=0) - HOME défend, AWAY attaque
    // Pas de CROSS ici (on est dans la surface, pas sur l'aile)
    // ============================================
    "0,0": { 
        allowedRoles: ["GK", "DC", "DL", "ST", "ML"], 
        baseTokens: [...boxTokens(false), ...boxTokensDefensive(), ...sys('CORNER_CLEARED', 2), ...sys('CROSS', 3), ...sys('CUT_BACK', 2)],
        defenseMultiplier: 2.0 
    },
    "0,1": { 
        allowedRoles: ["GK", "DC", "DL", "ST", "MC"], 
        baseTokens: [...boxTokens(false), ...boxTokensDefensive()],
        defenseMultiplier: 2.0 
    },
    "0,2": { 
        allowedRoles: ["GK", "DC", "ST", "MC"], 
        baseTokens: [...boxTokens(true), ...boxTokensDefensive(), ...gkZone()],
        defenseMultiplier: 1.8 
    },
    "0,3": { 
        allowedRoles: ["GK", "DC", "DR", "ST", "MC"], 
        baseTokens: [...boxTokens(false), ...boxTokensDefensive()],
        defenseMultiplier: 2.0 
    },
    "0,4": { 
        allowedRoles: ["GK", "DC", "DR", "ST", "MR"], 
        baseTokens: [...boxTokens(false), ...boxTokensDefensive(), ...sys('CORNER_CLEARED', 2), ...sys('CROSS', 3), ...sys('CUT_BACK', 2)],
        defenseMultiplier: 2.0 
    },

    // ============================================
    // DÉFENSE HOME (x=1) - Construction HOME
    // CROSS autorisé pour AWAY qui attaque (zones 1,0 et 1,4)
    // ============================================
    "1,0": { 
        allowedRoles: ["DL", "ML", "ST"], 
        baseTokens: wingTokensWithCross()  // ✅ CROSS pour AWAY attaquant
    },
    "1,1": { 
        allowedRoles: ["DC", "DL", "MC"], 
        baseTokens: [...centralBuildUp(), ...sys('CLEARANCE', 2)] 
    },
    "1,2": { 
        allowedRoles: ["DC", "MC", "GK"], 
        baseTokens: [...centralBuildUp(), ...sys('CLEARANCE', 2)] 
    },
    "1,3": { 
        allowedRoles: ["DC", "DR", "MC"], 
        baseTokens: [...centralBuildUp(), ...sys('CLEARANCE', 2)] 
    },
    "1,4": { 
        allowedRoles: ["DR", "MR", "ST"], 
        baseTokens: wingTokensWithCross()  // ✅ CROSS pour AWAY attaquant
    },

    // ============================================
    // MILIEU (x=2) - Zone de transition
    // Pas de CROSS (trop loin des buts)
    // ============================================
    "2,0": { 
        allowedRoles: ["DL", "ML", "MC"], 
        baseTokens: wingTokensMidfield() 
    },
    "2,1": { 
        allowedRoles: ["DC", "MC", "DL"], 
        baseTokens: centralBuildUp() 
    },
    "2,2": { 
        allowedRoles: ["MC", "DC"], 
        baseTokens: [...centralBuildUp(), ...sys('THROUGH_BALL', 1)] 
    },
    "2,3": { 
        allowedRoles: ["DC", "MC", "DR"], 
        baseTokens: centralBuildUp() 
    },
    "2,4": { 
        allowedRoles: ["DR", "MR", "MC"], 
        baseTokens: wingTokensMidfield() 
    },

    // ============================================
    // MILIEU OFFENSIF (x=3) - Création HOME
    // CROSS autorisé sur les ailes (y=0, y=4) pour HOME
    // ============================================
    "3,0": { 
        allowedRoles: ["ML", "DL", "MC", "ST"], 
        baseTokens: wingTokensWithCross()  // ✅ CROSS pour HOME attaquant
    },
    "3,1": { 
        allowedRoles: ["MC", "ST", "ML"], 
        baseTokens: centralOffensive() 
    },
    "3,2": { 
        allowedRoles: ["MC", "ST"], 
        baseTokens: [...centralOffensive(), ...sys('THROUGH_BALL', 2)] 
    },
    "3,3": { 
        allowedRoles: ["MC", "ST", "MR"], 
        baseTokens: centralOffensive() 
    },
    "3,4": { 
        allowedRoles: ["MR", "DR", "MC", "ST"], 
        baseTokens: wingTokensWithCross()  // ✅ CROSS pour HOME attaquant
    },

    // ============================================
    // ENTRÉE SURFACE AWAY (x=4) - Zone chaude HOME
    // CROSS autorisé sur les ailes (y=0, y=4) pour HOME
    // ============================================
    "4,0": { 
        allowedRoles: ["ML", "ST", "MC", "DL"], 
        baseTokens: [...wingTokensWithCross(), ...sys('SHOOT_OFF_TARGET', 2)]  // ✅ CROSS + tirs
    },
    "4,1": { 
        allowedRoles: ["MC", "ST", "ML"], 
        baseTokens: boxEntrance() 
    },
    "4,2": { 
        allowedRoles: ["ST", "MC"], 
        baseTokens: [...boxEntrance(), ...sys('SHOOT_GOAL', 2)] 
    },
    "4,3": { 
        allowedRoles: ["MC", "ST", "MR"], 
        baseTokens: boxEntrance() 
    },
    "4,4": { 
        allowedRoles: ["MR", "ST", "MC", "DR"], 
        baseTokens: [...wingTokensWithCross(), ...sys('SHOOT_OFF_TARGET', 2)]  // ✅ CROSS + tirs
    },

    // ============================================
    // SURFACE AWAY (x=5) - AWAY défend, HOME attaque
    // AWAY a les CLEARANCE ici, HOME tire
    // ============================================
    "5,0": { 
        allowedRoles: ["GK", "DC", "DL", "ST", "ML"], 
        baseTokens: [...boxTokens(false), ...boxTokensDefensive(), ...sys('CORNER_CLEARED', 2), ...sys('CROSS', 3), ...sys('CUT_BACK', 2)],
        defenseMultiplier: 2.0 
    },
    "5,1": { 
        allowedRoles: ["GK", "DC", "DL", "ST", "MC", "ML"], 
        baseTokens: [...boxTokens(false), ...boxTokensDefensive()],
        defenseMultiplier: 2.0 
    },
    "5,2": { 
        allowedRoles: ["GK", "DC", "ST", "MC"], 
        baseTokens: [...boxTokens(true), ...boxTokensDefensive(), ...gkZone()],
        defenseMultiplier: 1.8 
    },
    "5,3": { 
        allowedRoles: ["GK", "DC", "DR", "ST", "MC", "MR"], 
        baseTokens: [...boxTokens(false), ...boxTokensDefensive()],
        defenseMultiplier: 2.0 
    },
    "5,4": { 
        allowedRoles: ["GK", "DC", "DR", "ST", "MR"], 
        baseTokens: [...boxTokens(false), ...boxTokensDefensive(), ...sys('CORNER_CLEARED', 2), ...sys('CROSS', 3), ...sys('CUT_BACK', 2)],
        defenseMultiplier: 2.0 
    },
};

export const DEFAULT_ZONE_CONFIG: ZoneDefinition = {
    allowedRoles: ["MC", "DC", "ST"],
    baseTokens: [
        ...sys('PASS_SHORT', 4), 
        ...sys('PASS_BACK', 2),
        ...sys('INTERCEPT', 2),
        ...sys('TACKLE', 1)
    ],
    defenseMultiplier: 1.0
};
