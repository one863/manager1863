import { Token, TokenType } from "../types";

export interface ZoneDefinitionSplit {
    allowedRolesHome: string[];
    allowedRolesAway: string[];
    offenseTokensHome: Partial<Token>[];
    defenseTokensHome: Partial<Token>[];
    offenseTokensAway: Partial<Token>[];
    defenseTokensAway: Partial<Token>[];
}

// --- LES MOTEURS ---
const PASS_SHORT_TOKEN = { type: 'PASS_SHORT' as TokenType, quality: 40 };

const POSSESSION = [
    PASS_SHORT_TOKEN,
    { type: 'COMBO_PASS' as TokenType, quality: 20 },
    { type: 'PASS_SWITCH' as TokenType, quality: 15 },
    { type: 'PASS_BACK' as TokenType, quality: 15 }
];

const PRESSING = [
    { type: 'PRESSING_SUCCESS' as TokenType, quality: 40 },
    { type: 'INTERCEPT' as TokenType, quality: 30 },
    { type: 'TACKLE' as TokenType, quality: 20 },
    { type: 'YELLOW_CARD' as TokenType, quality: 2 }, // Intégré ici pour le milieu
    { type: 'FOUL' as TokenType, quality: 8 }
];

const FINITION_PROCHE = [
    PASS_SHORT_TOKEN,
    { type: 'SHOOT_GOAL' as TokenType, quality: 30 },
    { type: 'SHOOT_SAVED' as TokenType, quality: 25 },
    { type: 'HEAD_SHOT' as TokenType, quality: 20 },
    { type: 'VAR_CHECK' as TokenType, quality: 5 } // La VAR n'existe que dans la zone de tir
];
// Finition Axe : On peut marquer (x=5, y=1-3 pour Home)
const FINITION_AXE = [
    { type: 'PASS_SHORT' as TokenType, quality: 15 },
    { type: 'SHOOT_GOAL' as TokenType, quality: 35 }, 
    { type: 'SHOOT_SAVED' as TokenType, quality: 25 },
    { type: 'HEAD_SHOT' as TokenType, quality: 20 },
    { type: 'VAR_CHECK' as TokenType, quality: 5 }
];

// Finition Aile : On centre ou on remet en retrait (x=5, y=0 ou 4)
const FINITION_AILE = [
    { type: 'PASS_SHORT' as TokenType, quality: 30 },
    { type: 'CROSS' as TokenType, quality: 40 },      // Le jeton roi ici
    { type: 'CUT_BACK' as TokenType, quality: 25 },   // Remise dans l'axe
    { type: 'DRIBBLE' as TokenType, quality: 5 }      // Tentative de percussion
];
const RELANCE_GK = [
    PASS_SHORT_TOKEN,
    { type: 'GK_SHORT' as TokenType, quality: 50 },
    { type: 'GK_LONG' as TokenType, quality: 40 },
    { type: 'GK_BOULETTE' as TokenType, quality: 10 } // Le drama du gardien
];

export const ZONES_CONFIG: Record<string, ZoneDefinitionSplit> = {
    // --- COLONNE 0 : SURFACE HOME ---
        "0,0": { allowedRolesHome: ["DL", "LWB"], allowedRolesAway: ["RW", "AMR"], offenseTokensHome: [{ type: 'CLEARANCE_LOSE' as TokenType, quality: 50 }, { type: 'PASS_SHORT' as TokenType, quality: 50 }], defenseTokensHome: PRESSING, offenseTokensAway: [{ type: 'CROSS' as TokenType, quality: 40 }, { type: 'PASS_SHORT' as TokenType, quality: 60 }], defenseTokensAway: [] },
    "0,1": { allowedRolesHome: ["DCL", "DL"], allowedRolesAway: ["ST", "STL"], offenseTokensHome: [{ type: 'PASS_SHORT' as TokenType, quality: 100 }], defenseTokensHome: PRESSING, offenseTokensAway: FINITION_PROCHE, defenseTokensAway: [] },
    "0,2": { allowedRolesHome: ["GK", "DC"], allowedRolesAway: ["ST", "CF"], offenseTokensHome: RELANCE_GK, defenseTokensHome: [...PRESSING, { type: 'BLOCK' as TokenType, quality: 40 }], offenseTokensAway: FINITION_PROCHE, defenseTokensAway: [] },
    "0,3": { allowedRolesHome: ["DCR", "DR"], allowedRolesAway: ["ST", "STR"], offenseTokensHome: [{ type: 'PASS_SHORT' as TokenType, quality: 100 }], defenseTokensHome: PRESSING, offenseTokensAway: FINITION_PROCHE, defenseTokensAway: [] },
    "0,4": { allowedRolesHome: ["DR", "RWB"], allowedRolesAway: ["LW", "AML"], offenseTokensHome: [{ type: 'CLEARANCE_LOSE' as TokenType, quality: 50 }, { type: 'PASS_SHORT' as TokenType, quality: 50 }], defenseTokensHome: PRESSING, offenseTokensAway: [{ type: 'CROSS' as TokenType, quality: 40 }, { type: 'PASS_SHORT' as TokenType, quality: 60 }], defenseTokensAway: [] },

    // --- COLONNE 1 : TRANSITION BASSE HOME / CONSTRUCTION AWAY ---
    "1,0": { allowedRolesHome: ["DL", "ML"], allowedRolesAway: ["MR", "RWB"], offenseTokensHome: POSSESSION, defenseTokensHome: PRESSING, offenseTokensAway: POSSESSION, defenseTokensAway: PRESSING },
    "1,1": { allowedRolesHome: ["DCL", "MC"], allowedRolesAway: ["MCR", "AMC"], offenseTokensHome: POSSESSION, defenseTokensHome: PRESSING, offenseTokensAway: POSSESSION, defenseTokensAway: PRESSING },
    "1,2": { allowedRolesHome: ["DC", "DM"], allowedRolesAway: ["AMC", "CF"], offenseTokensHome: POSSESSION, defenseTokensHome: PRESSING, offenseTokensAway: POSSESSION, defenseTokensAway: PRESSING },
    "1,3": { allowedRolesHome: ["DCR", "MC"], allowedRolesAway: ["MCL", "AMC"], offenseTokensHome: POSSESSION, defenseTokensHome: PRESSING, offenseTokensAway: POSSESSION, defenseTokensAway: PRESSING },
    "1,4": { allowedRolesHome: ["DR", "MR"], allowedRolesAway: ["ML", "LWB"], offenseTokensHome: POSSESSION, defenseTokensHome: PRESSING, offenseTokensAway: POSSESSION, defenseTokensAway: PRESSING },

    // --- COLONNE 2 & 3 : COEUR DU JEU (MILIEU) ---
    "2,0": { allowedRolesHome: ["ML"], allowedRolesAway: ["MR"], offenseTokensHome: POSSESSION, defenseTokensHome: PRESSING, offenseTokensAway: POSSESSION, defenseTokensAway: PRESSING },
    "2,1": { allowedRolesHome: ["MCL"], allowedRolesAway: ["MCR"], offenseTokensHome: POSSESSION, defenseTokensHome: PRESSING, offenseTokensAway: POSSESSION, defenseTokensAway: PRESSING },
    "2,2": { allowedRolesHome: ["MC", "DM"], allowedRolesAway: ["MC", "DM"], offenseTokensHome: POSSESSION, defenseTokensHome: PRESSING, offenseTokensAway: POSSESSION, defenseTokensAway: PRESSING },
    "2,3": { allowedRolesHome: ["MCR"], allowedRolesAway: ["MCL"], offenseTokensHome: POSSESSION, defenseTokensHome: PRESSING, offenseTokensAway: POSSESSION, defenseTokensAway: PRESSING },
    "2,4": { allowedRolesHome: ["MR"], allowedRolesAway: ["ML"], offenseTokensHome: POSSESSION, defenseTokensHome: PRESSING, offenseTokensAway: POSSESSION, defenseTokensAway: PRESSING },
    
    "3,0": { allowedRolesHome: ["ML"], allowedRolesAway: ["MR"], offenseTokensHome: POSSESSION, defenseTokensHome: PRESSING, offenseTokensAway: POSSESSION, defenseTokensAway: PRESSING },
    "3,1": { allowedRolesHome: ["MCL"], allowedRolesAway: ["MCR"], offenseTokensHome: POSSESSION, defenseTokensHome: PRESSING, offenseTokensAway: POSSESSION, defenseTokensAway: PRESSING },
    "3,2": { allowedRolesHome: ["MC", "AMC"], allowedRolesAway: ["MC", "DM"], offenseTokensHome: POSSESSION, defenseTokensHome: PRESSING, offenseTokensAway: POSSESSION, defenseTokensAway: PRESSING },
    "3,3": { allowedRolesHome: ["MCR"], allowedRolesAway: ["MCL"], offenseTokensHome: POSSESSION, defenseTokensHome: PRESSING, offenseTokensAway: POSSESSION, defenseTokensAway: PRESSING },
    "3,4": { allowedRolesHome: ["MR"], allowedRolesAway: ["ML"], offenseTokensHome: POSSESSION, defenseTokensHome: PRESSING, offenseTokensAway: POSSESSION, defenseTokensAway: PRESSING },

    // --- COLONNE 4 : CONSTRUCTION HOME / TRANSITION BASSE AWAY ---
    "4,0": { allowedRolesHome: ["AML", "LW"], allowedRolesAway: ["DR", "MR"], offenseTokensHome: POSSESSION, defenseTokensHome: PRESSING, offenseTokensAway: POSSESSION, defenseTokensAway: PRESSING },
    "4,1": { allowedRolesHome: ["STL", "MCL"], allowedRolesAway: ["DCL", "MC"], offenseTokensHome: POSSESSION, defenseTokensHome: PRESSING, offenseTokensAway: POSSESSION, defenseTokensAway: PRESSING },
    "4,2": { allowedRolesHome: ["ST", "AMC"], allowedRolesAway: ["DC", "DM"], offenseTokensHome: POSSESSION, defenseTokensHome: PRESSING, offenseTokensAway: POSSESSION, defenseTokensAway: PRESSING },
    "4,3": { allowedRolesHome: ["STR", "MCR"], allowedRolesAway: ["DCR", "MC"], offenseTokensHome: POSSESSION, defenseTokensHome: PRESSING, offenseTokensAway: POSSESSION, defenseTokensAway: PRESSING },
    "4,4": { allowedRolesHome: ["AMR", "RW"], allowedRolesAway: ["DL", "ML"], offenseTokensHome: POSSESSION, defenseTokensHome: PRESSING, offenseTokensAway: POSSESSION, defenseTokensAway: PRESSING },

    // --- COLONNE 5 : SURFACE AWAY ---
    "5,0": { allowedRolesHome: ["LW", "AML"], allowedRolesAway: ["DL", "LWB"], offenseTokensHome: [{ type: 'CROSS' as TokenType, quality: 40 }, { type: 'PASS_SHORT' as TokenType, quality: 60 }], defenseTokensHome: [], offenseTokensAway: [{ type: 'CLEARANCE_LOSE' as TokenType, quality: 50 }, { type: 'PASS_SHORT' as TokenType, quality: 50 }], defenseTokensAway: PRESSING },
    "5,1": { allowedRolesHome: ["ST", "STL"], allowedRolesAway: ["DCL", "DL"], offenseTokensHome: FINITION_PROCHE, defenseTokensHome: [], offenseTokensAway: [{ type: 'PASS_SHORT' as TokenType, quality: 100 }], defenseTokensAway: PRESSING },
    "5,2": { allowedRolesHome: ["ST", "CF"], allowedRolesAway: ["GK", "DC"], offenseTokensHome: FINITION_PROCHE, defenseTokensHome: [], offenseTokensAway: RELANCE_GK, defenseTokensAway: [...PRESSING, { type: 'BLOCK' as TokenType, quality: 40 }] },
    "5,3": { allowedRolesHome: ["ST", "STR"], allowedRolesAway: ["DCR", "DR"], offenseTokensHome: FINITION_PROCHE, defenseTokensHome: [], offenseTokensAway: [{ type: 'PASS_SHORT' as TokenType, quality: 100 }], defenseTokensAway: PRESSING },
    "5,4": { allowedRolesHome: ["RW", "AMR"], allowedRolesAway: ["DR", "RWB"], offenseTokensHome: [{ type: 'CROSS' as TokenType, quality: 40 }, { type: 'PASS_SHORT' as TokenType, quality: 60 }], defenseTokensHome: [], offenseTokensAway: [{ type: 'CLEARANCE_LOSE' as TokenType, quality: 50 }, { type: 'PASS_SHORT' as TokenType, quality: 50 }], defenseTokensAway: PRESSING }
};