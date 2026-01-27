import { Token, TokenType } from "../types";

export interface ZoneDefinitionSplit {
    allowedRolesHome: string[];
    allowedRolesAway: string[];
    offenseTokensHome: Partial<Token>[];
    defenseTokensHome: Partial<Token>[];
    offenseTokensAway: Partial<Token>[];
    defenseTokensAway: Partial<Token>[];
}

// ==========================================
// 1. MOTEURS DE JETONS (BUNDLES)
// ==========================================

const PASS_SHORT_TOKEN = { type: 'PASS_SHORT' as TokenType, quality: 40 };

// Construction et circulation au milieu
const POSSESSION = [
    PASS_SHORT_TOKEN,
    { type: 'COMBO_PASS' as TokenType, quality: 20 },
    { type: 'PASS_SWITCH' as TokenType, quality: 15 },
    { type: 'PASS_BACK' as TokenType, quality: 15 },
    { type: 'DRIBBLE' as TokenType, quality: 10 }
];

// Intensité défensive et fautes
const PRESSING = [
    { type: 'PRESSING_SUCCESS' as TokenType, quality: 35 },
    { type: 'INTERCEPT' as TokenType, quality: 30 },
    { type: 'TACKLE' as TokenType, quality: 20 },
    { type: 'FOUL' as TokenType, quality: 10 },
    { type: 'YELLOW_CARD' as TokenType, quality: 3 },
    { type: 'RED_CARD' as TokenType, quality: 0.5 }
];

// Finition dans l'axe (Y=1, 2, 3) - TIR AUTORISÉ
const FINITION_AXE = [
    PASS_SHORT_TOKEN,
    { type: 'SHOOT_GOAL' as TokenType, quality: 35 }, 
    { type: 'SHOOT_SAVED' as TokenType, quality: 25 },
    { type: 'HEAD_SHOT' as TokenType, quality: 20 },
    { type: 'VAR_CHECK' as TokenType, quality: 5 },
    { type: 'FOUL_PENALTY' as TokenType, quality: 5 }
];

// Finition sur les ailes (Y=0, 4) - TIR INTERDIT (Centres uniquement)
const FINITION_AILE = [
    PASS_SHORT_TOKEN,
    { type: 'CROSS' as TokenType, quality: 45 },
    { type: 'CUT_BACK' as TokenType, quality: 30 },
    { type: 'DRIBBLE' as TokenType, quality: 20 },
    { type: 'THROW_IN_SAFE' as TokenType, quality: 5 }
];

// Sortie de balle du Gardien
const RELANCE_GK = [
    PASS_SHORT_TOKEN,
    { type: 'GK_SHORT' as TokenType, quality: 45 },
    { type: 'GK_LONG' as TokenType, quality: 35 },
    { type: 'CLEARANCE_KEEP' as TokenType, quality: 15 },
    { type: 'GK_BOULETTE' as TokenType, quality: 5 }
];

// ==========================================
// 2. CONFIGURATION DE LA GRILLE (6x5)
// ==========================================

export const ZONES_CONFIG: Record<string, ZoneDefinitionSplit> = {};

// --- INITIALISATION DE BASE ---
// On remplit tout par défaut pour éviter les crashs "undefined"
for (let x = 0; x < 6; x++) {
    for (let y = 0; y < 5; y++) {
        ZONES_CONFIG[`${x},${y}`] = {
            allowedRolesHome: ["MC", "DC", "ST"],
            allowedRolesAway: ["MC", "DC", "ST"],
            offenseTokensHome: POSSESSION,
            defenseTokensHome: PRESSING,
            offenseTokensAway: POSSESSION,
            defenseTokensAway: PRESSING
        };
    }
}

// --- SURCHARGES SPÉCIFIQUES ---

// X = 0 (ZONE CRITIQUE HOME)
for (let y = 0; y < 5; y++) {
    const isWing = (y === 0 || y === 4);
    const zone = ZONES_CONFIG[`0,${y}`];
    
    zone.offenseTokensAway = isWing ? FINITION_AILE : FINITION_AXE;
    zone.defenseTokensHome = [...PRESSING, { type: 'BLOCK' as TokenType, quality: 30 }];
    zone.allowedRolesHome = isWing ? ["DL", "DR", "LWB", "RWB"] : ["GK", "DC", "DCL", "DCR"];
    zone.allowedRolesAway = isWing ? ["LW", "RW", "AML", "AMR"] : ["ST", "CF", "AMC"];
}
ZONES_CONFIG["0,2"].offenseTokensHome = RELANCE_GK;

// X = 1 (SORTIE HOME / APPROCHE AWAY)
for (let y = 0; y < 5; y++) {
    const isWing = (y === 0 || y === 4);
    const zone = ZONES_CONFIG[`1,${y}`];
    zone.allowedRolesHome = isWing ? ["DL", "DR", "ML", "MR"] : ["DC", "DM", "MC"];
    if (isWing) zone.offenseTokensAway = [...POSSESSION, { type: 'CROSS' as TokenType, quality: 20 }];
}

// X = 2 & 3 (COEUR DU JEU - TRANSITION)
for (let x = 2; x <= 3; x++) {
    for (let y = 0; y < 5; y++) {
        const isWing = (y === 0 || y === 4);
        const zone = ZONES_CONFIG[`${x},${y}`];
        zone.allowedRolesHome = isWing ? ["ML", "MR", "LWB", "RWB"] : ["MC", "DM", "AMC"];
        zone.allowedRolesAway = isWing ? ["ML", "MR", "LWB", "RWB"] : ["MC", "DM", "AMC"];
    }
}

// X = 4 (APPROCHE HOME / SORTIE AWAY)
for (let y = 0; y < 5; y++) {
    const isWing = (y === 0 || y === 4);
    const zone = ZONES_CONFIG[`4,${y}`];
    zone.allowedRolesAway = isWing ? ["DL", "DR", "ML", "MR"] : ["DC", "DM", "MC"];
    if (isWing) zone.offenseTokensHome = [...POSSESSION, { type: 'CROSS' as TokenType, quality: 20 }];
}

// X = 5 (ZONE CRITIQUE AWAY)
for (let y = 0; y < 5; y++) {
    const isWing = (y === 0 || y === 4);
    const zone = ZONES_CONFIG[`5,${y}`];
    
    zone.offenseTokensHome = isWing ? FINITION_AILE : FINITION_AXE;
    zone.defenseTokensAway = [...PRESSING, { type: 'BLOCK' as TokenType, quality: 30 }];
    zone.allowedRolesAway = isWing ? ["DL", "DR", "LWB", "RWB"] : ["GK", "DC", "DCL", "DCR"];
    zone.allowedRolesHome = isWing ? ["LW", "RW", "AML", "AMR"] : ["ST", "CF", "AMC"];
}
ZONES_CONFIG["5,2"].offenseTokensAway = RELANCE_GK;

// ==========================================
// 3. CONFIGURATION PAR DÉFAUT (SÉCURITÉ)
// ==========================================

export const DEFAULT_ZONE_CONFIG: ZoneDefinitionSplit = {
    allowedRolesHome: ["MC"],
    allowedRolesAway: ["MC"],
    offenseTokensHome: [PASS_SHORT_TOKEN],
    defenseTokensHome: PRESSING,
    offenseTokensAway: [PASS_SHORT_TOKEN],
    defenseTokensAway: PRESSING
};