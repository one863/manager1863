import { Token, TokenType, ZoneDefinition } from "../types";

const sys = (type: TokenType, count: number = 1, quality: number = 30): Partial<Token>[] => 
    Array(Math.floor(count)).fill({ type, quality, duration: 5 });

export const ZONES_CONFIG: Record<string, ZoneDefinition> = {
    // --- AXE MILIEU (Construction variée) ---
    "2,0": { allowedRoles: ["DL", "ML"], baseTokens: [...sys('PASS_SHORT', 4), ...sys('PASS_LONG', 2), ...sys('PASS_BACK', 2), ...sys('INTERCEPT', 2)] },
    "2,1": { allowedRoles: ["DC", "MC"], baseTokens: [...sys('PASS_SHORT', 4), ...sys('PASS_LONG', 2), ...sys('PASS_BACK', 2), ...sys('INTERCEPT', 2)] },
    "2,2": { allowedRoles: ["DC", "MC"], baseTokens: [...sys('PASS_SHORT', 6), ...sys('PASS_SWITCH', 2), ...sys('PASS_LONG', 1), ...sys('INTERCEPT', 1)] },
    "2,3": { allowedRoles: ["DC", "MC"], baseTokens: [...sys('PASS_SHORT', 4), ...sys('PASS_LONG', 2), ...sys('PASS_BACK', 2), ...sys('INTERCEPT', 2)] },
    "2,4": { allowedRoles: ["DR", "MR"], baseTokens: [...sys('PASS_SHORT', 4), ...sys('PASS_LONG', 2), ...sys('PASS_BACK', 2), ...sys('INTERCEPT', 2)] },
    "3,0": { allowedRoles: ["DL", "ML"], baseTokens: [...sys('PASS_SHORT', 3), ...sys('PASS_LONG', 3), ...sys('DRIBBLE', 2), ...sys('INTERCEPT', 2)] },
    "3,1": { allowedRoles: ["MC"], baseTokens: [...sys('PASS_SHORT', 3), ...sys('PASS_LONG', 3), ...sys('DRIBBLE', 2), ...sys('INTERCEPT', 2)] },
    "3,2": { allowedRoles: ["MC"], baseTokens: [...sys('PASS_SHORT', 4), ...sys('THROUGH_BALL', 2), ...sys('PASS_SWITCH', 1), ...sys('INTERCEPT', 2)] },
    "3,3": { allowedRoles: ["MC"], baseTokens: [...sys('PASS_SHORT', 3), ...sys('PASS_LONG', 3), ...sys('DRIBBLE', 2), ...sys('INTERCEPT', 2)] },
    "3,4": { allowedRoles: ["DR", "MR"], baseTokens: [...sys('PASS_SHORT', 3), ...sys('PASS_LONG', 3), ...sys('DRIBBLE', 2), ...sys('INTERCEPT', 2)] },

    // --- AILES : Centres ---
    "0,0": { allowedRoles: ["DL", "GK"], baseTokens: [...sys('DRIBBLE', 3), ...sys('PASS_SHORT', 2), ...sys('PASS_BACK', 2), ...sys('CROSS', 3)] },
    "1,0": { allowedRoles: ["DL", "ML"], baseTokens: [...sys('DRIBBLE', 3), ...sys('PASS_SHORT', 2), ...sys('PASS_BACK', 2), ...sys('CROSS', 3)] },
    "0,4": { allowedRoles: ["DR", "GK"], baseTokens: [...sys('DRIBBLE', 3), ...sys('PASS_SHORT', 2), ...sys('PASS_BACK', 2), ...sys('CROSS', 3)] },
    "1,4": { allowedRoles: ["DR", "MR"], baseTokens: [...sys('DRIBBLE', 3), ...sys('PASS_SHORT', 2), ...sys('PASS_BACK', 2), ...sys('CROSS', 3)] },
    "4,0": { allowedRoles: ["ML", "ST"], baseTokens: [...sys('DRIBBLE', 3), ...sys('PASS_SHORT', 2), ...sys('PASS_BACK', 2), ...sys('CROSS', 3)] },
    "5,0": { allowedRoles: ["ML", "ST"], baseTokens: [...sys('DRIBBLE', 3), ...sys('PASS_SHORT', 2), ...sys('PASS_BACK', 2), ...sys('CROSS', 3)] },
    "4,4": { allowedRoles: ["MR", "ST"], baseTokens: [...sys('DRIBBLE', 3), ...sys('PASS_SHORT', 2), ...sys('PASS_BACK', 2), ...sys('CROSS', 3)] },
    "5,4": { allowedRoles: ["MR", "ST"], baseTokens: [...sys('DRIBBLE', 3), ...sys('PASS_SHORT', 2), ...sys('PASS_BACK', 2), ...sys('CROSS', 3)] },

    // --- ZONES DEVANT LA SURFACE ---
    "1,1": { allowedRoles: ["DC", "MC"], baseTokens: [...sys('SHOOT_OFF_TARGET', 4), ...sys('PASS_SHORT', 2), ...sys('CLEARANCE', 2), ...sys('INTERCEPT', 3)] },
    "1,2": { allowedRoles: ["DC", "GK"], baseTokens: [...sys('SHOOT_OFF_TARGET', 4), ...sys('PASS_SHORT', 2), ...sys('CLEARANCE', 2), ...sys('INTERCEPT', 3)] },
    "1,3": { allowedRoles: ["DC", "MC"], baseTokens: [...sys('SHOOT_OFF_TARGET', 4), ...sys('PASS_SHORT', 2), ...sys('CLEARANCE', 2), ...sys('INTERCEPT', 3)] },
    "4,1": { allowedRoles: ["MC", "ST"], baseTokens: [...sys('SHOOT_OFF_TARGET', 4), ...sys('PASS_SHORT', 2), ...sys('CLEARANCE', 2), ...sys('INTERCEPT', 3)] },
    "4,2": { allowedRoles: ["MC", "ST"], baseTokens: [...sys('SHOOT_OFF_TARGET', 4), ...sys('PASS_SHORT', 2), ...sys('CLEARANCE', 2), ...sys('INTERCEPT', 3)] },
    "4,3": { allowedRoles: ["MC", "ST"], baseTokens: [...sys('SHOOT_OFF_TARGET', 4), ...sys('PASS_SHORT', 2), ...sys('CLEARANCE', 2), ...sys('INTERCEPT', 3)] },

    // --- SURFACES ---
    "0,1": { allowedRoles: ["GK", "DC", "DL"], baseTokens: [...sys('SHOOT_OFF_TARGET', 5), ...sys('TACKLE', 3), ...sys('SHOOT_SAVED', 4)], defenseMultiplier: 2.0 },
    "0,2": { allowedRoles: ["GK", "DC"], baseTokens: [...sys('SHOOT_OFF_TARGET', 5), ...sys('TACKLE', 3), ...sys('SHOOT_SAVED', 4)], defenseMultiplier: 1.8 },
    "0,3": { allowedRoles: ["GK", "DC", "DR"], baseTokens: [...sys('SHOOT_OFF_TARGET', 5), ...sys('TACKLE', 3), ...sys('SHOOT_SAVED', 4)], defenseMultiplier: 2.0 },
    "5,1": { allowedRoles: ["ST", "ML"], baseTokens: [...sys('SHOOT_OFF_TARGET', 5), ...sys('TACKLE', 3), ...sys('SHOOT_SAVED', 4)], defenseMultiplier: 2.0 },
    "5,2": { allowedRoles: ["ST"], baseTokens: [...sys('SHOOT_OFF_TARGET', 5), ...sys('TACKLE', 3), ...sys('SHOOT_SAVED', 4)], defenseMultiplier: 1.8 },
    "5,3": { allowedRoles: ["ST", "MR"], baseTokens: [...sys('SHOOT_OFF_TARGET', 5), ...sys('TACKLE', 3), ...sys('SHOOT_SAVED', 4)], defenseMultiplier: 2.0 },
};

export const DEFAULT_ZONE_CONFIG: ZoneDefinition = {
    allowedRoles: ["MC"],
    baseTokens: [
        ...sys('PASS_SHORT', 3), 
        ...sys('PASS_BACK', 2),
        ...sys('INTERCEPT', 1),
        ...sys('NEUTRAL_POSSESSION', 1)
    ],
    defenseMultiplier: 1.0
};
