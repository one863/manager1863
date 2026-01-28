import { Token } from "../types";

export interface ZoneDefinitionSplit {
    offenseTokensHome: Partial<Token>[];
    defenseTokensHome: Partial<Token>[];
    offenseTokensAway: Partial<Token>[];
    defenseTokensAway: Partial<Token>[];
}

// ==========================================
// 1. DÉFINITION DES BUNDLES (LOGIQUE DE RÔLES)
// ==========================================

const OFF_BUILDUP = [
    { type: 'PASS_SHORT', role: 'DC' }, { type: 'PASS_SHORT', role: 'DL' },
    { type: 'PASS_LATERAL', role: 'DL' }, { type: 'PASS_BACK', role: 'MC' },
    { type: 'PASS_LONG', role: 'DC' }, { type: 'DRIBBLE', role: 'DR' },
    { type: 'PASS_SHORT', role: 'GK' } // Le gardien participe à la relance
];

const OFF_MIDFIELD = [
    { type: 'PASS_SHORT', role: 'MC' }, { type: 'DRIBBLE', role: 'ML' }, 
    { type: 'PASS_THROUGH', role: 'MC' }, { type: 'PASS_LATERAL', role: 'MR' },
    { type: 'PASS_BACK', role: 'MC' }, { type: 'PASS_EXTRA', role: 'MC' } 
];

const OFF_ATTACK = [
    { type: 'DRIBBLE', role: 'ML' }, { type: 'DRIBBLE', role: 'ST' },
    { type: 'CROSS', role: 'ML' }, { type: 'CROSS', role: 'MR' },
    { type: 'PASS_THROUGH', role: 'MC' }, { type: 'CUT_INSIDE', role: 'MR' }
];

const OFF_FINISH = [
    { type: 'SHOOT_GOAL', role: 'ST' }, 
    { type: 'SHOOT_SAVED', role: 'ST' }, { type: 'SHOOT_SAVED', role: 'ML' }, 
    { type: 'SHOOT_OFF', role: 'ST' }, { type: 'SHOOT_OFF', role: 'MC' },
    { type: 'PASS_SHORT', role: 'ST' }, { type: 'PASS_SHORT', role: 'MR' },
    { type: 'DRIBBLE_SHOT', role: 'ST' }, { type: 'DRIBBLE_SHOT', role: 'ML' },
    { type: 'PASS_EXTRA', role: 'MC' }
];

// --- DEFENSE ---

const DEF_STANDARD = [
    { type: 'TACKLE', role: 'MC' }, { type: 'TACKLE', role: 'ML' },
    { type: 'INTERCEPT', role: 'MC' }, { type: 'INTERCEPT', role: 'MR' },
    { type: 'PRESS', role: 'MC' }, { type: 'PRESS', role: 'ST' }, // Pressing des attaquants
    { type: 'BLOCK_PASS', role: 'MC' }
];

const DEF_DENSE = [
    { type: 'TACKLE', role: 'DC' }, { type: 'TACKLE', role: 'DL' }, { type: 'TACKLE', role: 'MC' },
    { type: 'INTERCEPT', role: 'DC' }, { type: 'INTERCEPT', role: 'DR' },
    { type: 'PRESS', role: 'MC' }, { type: 'PRESS', role: 'ML' },
    { type: 'BLOCK_PASS', role: 'DC' }, { type: 'CLEARANCE', role: 'DL' }
];

const DEF_LOW_BLOCK = [
    { type: 'BLOCK_SHOT', role: 'DC' }, { type: 'BLOCK_SHOT', role: 'DC' },
    { type: 'TACKLE', role: 'DC' }, { type: 'TACKLE', role: 'DC' },
    { type: 'CLEARANCE', role: 'DC' }, { type: 'CLEARANCE', role: 'DL' },
    { type: 'INTERCEPT', role: 'DC' }, { type: 'GK_SAVE', role: 'GK' }
];

const GK_DISTRIBUTION = [
    { type: 'GK_SHORT', role: 'GK' }, { type: 'GK_LONG', role: 'GK' }, { type: 'GK_HAND', role: 'GK' }
];

// ==========================================
// 2. CONFIGURATION DE LA GRILLE (6x5)
// ==========================================

export const ZONES_CONFIG: Record<string, ZoneDefinitionSplit> = {
    // --- COLONNE 0 : ZONE CRITIQUE HOME (GK Home / Attaque Away) ---
    "0,0": { offenseTokensHome: OFF_BUILDUP, defenseTokensHome: DEF_LOW_BLOCK, offenseTokensAway: OFF_ATTACK, defenseTokensAway: DEF_DENSE },
    "0,1": { offenseTokensHome: OFF_BUILDUP, defenseTokensHome: DEF_LOW_BLOCK, offenseTokensAway: OFF_FINISH, defenseTokensAway: DEF_DENSE },
    "0,2": { offenseTokensHome: GK_DISTRIBUTION, defenseTokensHome: DEF_LOW_BLOCK, offenseTokensAway: OFF_FINISH, defenseTokensAway: DEF_DENSE },
    "0,3": { offenseTokensHome: OFF_BUILDUP, defenseTokensHome: DEF_LOW_BLOCK, offenseTokensAway: OFF_FINISH, defenseTokensAway: DEF_DENSE },
    "0,4": { offenseTokensHome: OFF_BUILDUP, defenseTokensHome: DEF_LOW_BLOCK, offenseTokensAway: OFF_ATTACK, defenseTokensAway: DEF_DENSE },

    // --- COLONNE 1 : FILTRE DÉFENSIF HOME ---
    "1,0": { offenseTokensHome: OFF_BUILDUP, defenseTokensHome: DEF_DENSE, offenseTokensAway: OFF_ATTACK, defenseTokensAway: DEF_STANDARD },
    "1,1": { offenseTokensHome: OFF_BUILDUP, defenseTokensHome: DEF_DENSE, offenseTokensAway: OFF_MIDFIELD, defenseTokensAway: DEF_STANDARD },
    "1,2": { offenseTokensHome: OFF_BUILDUP, defenseTokensHome: DEF_DENSE, offenseTokensAway: OFF_MIDFIELD, defenseTokensAway: DEF_STANDARD },
    "1,3": { offenseTokensHome: OFF_BUILDUP, defenseTokensHome: DEF_DENSE, offenseTokensAway: OFF_MIDFIELD, defenseTokensAway: DEF_STANDARD },
    "1,4": { offenseTokensHome: OFF_BUILDUP, defenseTokensHome: DEF_DENSE, offenseTokensAway: OFF_ATTACK, defenseTokensAway: DEF_STANDARD },

    // --- COLONNES 2 & 3 : MILIEU (BATAILLE POSSESSION) ---
    "2,0": { offenseTokensHome: OFF_MIDFIELD, defenseTokensHome: DEF_STANDARD, offenseTokensAway: OFF_MIDFIELD, defenseTokensAway: DEF_STANDARD },
    "2,1": { offenseTokensHome: OFF_MIDFIELD, defenseTokensHome: DEF_STANDARD, offenseTokensAway: OFF_MIDFIELD, defenseTokensAway: DEF_STANDARD },
    "2,2": { offenseTokensHome: OFF_MIDFIELD, defenseTokensHome: DEF_STANDARD, offenseTokensAway: OFF_MIDFIELD, defenseTokensAway: DEF_STANDARD },
    "2,3": { offenseTokensHome: OFF_MIDFIELD, defenseTokensHome: DEF_STANDARD, offenseTokensAway: OFF_MIDFIELD, defenseTokensAway: DEF_STANDARD },
    "2,4": { offenseTokensHome: OFF_MIDFIELD, defenseTokensHome: DEF_STANDARD, offenseTokensAway: OFF_MIDFIELD, defenseTokensAway: DEF_STANDARD },

    "3,0": { offenseTokensHome: OFF_MIDFIELD, defenseTokensHome: DEF_STANDARD, offenseTokensAway: OFF_MIDFIELD, defenseTokensAway: DEF_STANDARD },
    "3,1": { offenseTokensHome: OFF_MIDFIELD, defenseTokensHome: DEF_STANDARD, offenseTokensAway: OFF_MIDFIELD, defenseTokensAway: DEF_STANDARD },
    "3,2": { offenseTokensHome: OFF_MIDFIELD, defenseTokensHome: DEF_STANDARD, offenseTokensAway: OFF_MIDFIELD, defenseTokensAway: DEF_STANDARD },
    "3,3": { offenseTokensHome: OFF_MIDFIELD, defenseTokensHome: DEF_STANDARD, offenseTokensAway: OFF_MIDFIELD, defenseTokensAway: DEF_STANDARD },
    "3,4": { offenseTokensHome: OFF_MIDFIELD, defenseTokensHome: DEF_STANDARD, offenseTokensAway: OFF_MIDFIELD, defenseTokensAway: DEF_STANDARD },

    // --- COLONNE 4 : FILTRE DÉFENSIF AWAY ---
    "4,0": { offenseTokensHome: OFF_ATTACK, defenseTokensHome: DEF_STANDARD, offenseTokensAway: OFF_BUILDUP, defenseTokensAway: DEF_DENSE },
    "4,1": { offenseTokensHome: OFF_MIDFIELD, defenseTokensHome: DEF_STANDARD, offenseTokensAway: OFF_BUILDUP, defenseTokensAway: DEF_DENSE },
    "4,2": { offenseTokensHome: OFF_MIDFIELD, defenseTokensHome: DEF_STANDARD, offenseTokensAway: OFF_BUILDUP, defenseTokensAway: DEF_DENSE },
    "4,3": { offenseTokensHome: OFF_MIDFIELD, defenseTokensHome: DEF_STANDARD, offenseTokensAway: OFF_BUILDUP, defenseTokensAway: DEF_DENSE },
    "4,4": { offenseTokensHome: OFF_ATTACK, defenseTokensHome: DEF_STANDARD, offenseTokensAway: OFF_BUILDUP, defenseTokensAway: DEF_DENSE },

    // --- COLONNE 5 : ZONE CRITIQUE AWAY (GK Away / Attaque Home) ---
    "5,0": { offenseTokensHome: OFF_ATTACK, defenseTokensHome: DEF_DENSE, offenseTokensAway: OFF_BUILDUP, defenseTokensAway: DEF_LOW_BLOCK },
    "5,1": { offenseTokensHome: OFF_FINISH, defenseTokensHome: DEF_DENSE, offenseTokensAway: OFF_BUILDUP, defenseTokensAway: DEF_LOW_BLOCK },
    "5,2": { offenseTokensHome: OFF_FINISH, defenseTokensHome: DEF_DENSE, offenseTokensAway: GK_DISTRIBUTION, defenseTokensAway: DEF_LOW_BLOCK },
    "5,3": { offenseTokensHome: OFF_FINISH, defenseTokensHome: DEF_DENSE, offenseTokensAway: OFF_BUILDUP, defenseTokensAway: DEF_LOW_BLOCK },
    "5,4": { offenseTokensHome: OFF_ATTACK, defenseTokensHome: DEF_DENSE, offenseTokensAway: OFF_BUILDUP, defenseTokensAway: DEF_LOW_BLOCK },
};

export const DEFAULT_ZONE_CONFIG: ZoneDefinitionSplit = {
    offenseTokensHome: OFF_MIDFIELD,
    defenseTokensHome: DEF_STANDARD,
    offenseTokensAway: OFF_MIDFIELD,
    defenseTokensAway: DEF_STANDARD
};