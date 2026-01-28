import { Token } from "../types";


export interface ZoneDefinitionSplit {
    offenseTokensHome: Partial<Token>[];
    defenseTokensHome: Partial<Token>[];
    offenseTokensAway: Partial<Token>[];
    defenseTokensAway: Partial<Token>[];
}

// ==========================================
// 1. MOTEURS DE JETONS (BUNDLES)
// ==========================================

const POSS = [
    { type: 'PASS_SHORT' },
    { type: 'PASS_SHORT' },
    { type: 'DRIBBLE' }, { type: 'DRIBBLE' }
];

const PRES = [
    { type: 'PRESS' },{ type: 'PRESS' },
    { type: 'PRESS' },
    { type: 'PRESS' },
];

// Finition axe central - plus de SHOOT_GOAL
const FIN_AXE = [
    { type: 'SHOOT_GOAL' },
    { type: 'PASS_SHORT' },
    { type: 'DRIBBLE' },
    { type: 'PASS_BACK' }
];

// Finition aile
const FIN_AILE = [
    { type: 'PASS_SHORT' },
    { type: 'DRIBBLE' },
    { type: 'PASS_SHORT' }
];

// Tir après centre
const FIN_CENTER = [
    { type: 'SHOOT_GOAL' },
    { type: 'SHOOT_GOAL' },
    { type: 'PASS_SHORT' },
    { type: 'SHOOT_SAVED' }
];

const GK_RELANCE = [
    { type: 'PRESS' },
    { type: 'GK_SHORT' },
    { type: 'GK_LONG' },
    { type: 'SHOOT_SAVED' }
];

const DEF_STRICT = [
    ...PRES,
    { type: 'PRESS' },
    { type: 'SHOOT_SAVED' },
];

// ==========================================
// 2. CONFIGURATION DE LA GRILLE (30 ZONES)
// ==========================================

export const ZONES_CONFIG: Record<string, ZoneDefinitionSplit> = {
    // --- COLONNE 0 : ZONE CRITIQUE HOME (But Home) ---
    // Away attack - more SHOOT_GOAL tokens
    "0,0": { offenseTokensHome: POSS, defenseTokensHome: DEF_STRICT, offenseTokensAway: FIN_AILE, defenseTokensAway: PRES },
    "0,1": { offenseTokensHome: POSS, defenseTokensHome: DEF_STRICT, offenseTokensAway: FIN_AXE, defenseTokensAway: PRES },
    "0,2": { offenseTokensHome: POSS, defenseTokensHome: GK_RELANCE, offenseTokensAway: FIN_CENTER, defenseTokensAway: PRES },
    "0,3": { offenseTokensHome: POSS, defenseTokensHome: DEF_STRICT, offenseTokensAway: FIN_AXE, defenseTokensAway: PRES },
    "0,4": { offenseTokensHome: POSS, defenseTokensHome: DEF_STRICT, offenseTokensAway: FIN_AILE, defenseTokensAway: PRES },

    // --- COLONNE 1 : SORTIE DE BALLE HOME ---
    "1,0": { offenseTokensHome: FIN_AILE, defenseTokensHome: PRES, offenseTokensAway: FIN_AILE, defenseTokensAway: PRES },
    "1,1": { offenseTokensHome: POSS, defenseTokensHome: PRES, offenseTokensAway: POSS, defenseTokensAway: PRES },
    "1,2": { offenseTokensHome: POSS, defenseTokensHome: PRES, offenseTokensAway: POSS, defenseTokensAway: PRES },
    "1,3": { offenseTokensHome: POSS, defenseTokensHome: PRES, offenseTokensAway: POSS, defenseTokensAway: PRES },
    "1,4": { offenseTokensHome: POSS, defenseTokensHome: PRES, offenseTokensAway: FIN_AILE, defenseTokensAway: PRES },

    // --- COLONNE 2 : MILIEU TERRAIN (Transition Basse Home) ---
    "2,0": { offenseTokensHome: POSS, defenseTokensHome: PRES, offenseTokensAway: POSS, defenseTokensAway: PRES },
    "2,1": { offenseTokensHome: POSS, defenseTokensHome: PRES, offenseTokensAway: POSS, defenseTokensAway: PRES },
    "2,2": { offenseTokensHome: POSS, defenseTokensHome: PRES, offenseTokensAway: POSS, defenseTokensAway: PRES },
    "2,3": { offenseTokensHome: POSS, defenseTokensHome: PRES, offenseTokensAway: POSS, defenseTokensAway: PRES },
    "2,4": { offenseTokensHome: POSS, defenseTokensHome: PRES, offenseTokensAway: POSS, defenseTokensAway: PRES },

    // --- COLONNE 3 : MILIEU TERRAIN (Transition Haute Home) ---
    "3,0": { offenseTokensHome: POSS, defenseTokensHome: PRES, offenseTokensAway: POSS, defenseTokensAway: PRES },
    "3,1": { offenseTokensHome: POSS, defenseTokensHome: PRES, offenseTokensAway: POSS, defenseTokensAway: PRES },
    "3,2": { offenseTokensHome: POSS, defenseTokensHome: PRES, offenseTokensAway: POSS, defenseTokensAway: PRES },
    "3,3": { offenseTokensHome: POSS, defenseTokensHome: PRES, offenseTokensAway: POSS, defenseTokensAway: PRES },
    "3,4": { offenseTokensHome: POSS, defenseTokensHome: PRES, offenseTokensAway: POSS, defenseTokensAway: PRES },

    // --- COLONNE 4 : APPROCHE FINITION HOME ---
    "4,0": { offenseTokensHome: FIN_AILE, defenseTokensHome: PRES, offenseTokensAway: POSS, defenseTokensAway: PRES },
    "4,1": { offenseTokensHome: POSS, defenseTokensHome: PRES, offenseTokensAway: POSS, defenseTokensAway: PRES },
    "4,2": { offenseTokensHome: POSS, defenseTokensHome: PRES, offenseTokensAway: POSS, defenseTokensAway: PRES },
    "4,3": { offenseTokensHome: POSS, defenseTokensHome: PRES, offenseTokensAway: POSS, defenseTokensAway: PRES },
    "4,4": { offenseTokensHome: FIN_AILE, defenseTokensHome: PRES, offenseTokensAway: POSS, defenseTokensAway: PRES },

    // --- COLONNE 5 : ZONE CRITIQUE AWAY (But Away) ---
    // Home attack - more SHOOT_GOAL tokens
    "5,0": { offenseTokensHome: FIN_AILE, defenseTokensHome: PRES, offenseTokensAway: POSS, defenseTokensAway: DEF_STRICT },
    "5,1": { offenseTokensHome: FIN_AXE, defenseTokensHome: PRES, offenseTokensAway: POSS, defenseTokensAway: DEF_STRICT },
    "5,2": { offenseTokensHome: FIN_CENTER, defenseTokensHome: PRES, offenseTokensAway: POSS, defenseTokensAway: GK_RELANCE },
    "5,3": { offenseTokensHome: FIN_AXE, defenseTokensHome: PRES, offenseTokensAway: POSS, defenseTokensAway: DEF_STRICT },
    "5,4": { offenseTokensHome: FIN_AILE, defenseTokensHome: PRES, offenseTokensAway: POSS, defenseTokensAway: DEF_STRICT },
};

export const DEFAULT_ZONE_CONFIG: ZoneDefinitionSplit = {
    offenseTokensHome: POSS,
    defenseTokensHome: PRES,
    offenseTokensAway: POSS,
    defenseTokensAway: PRES
};
