import { Token, TokenType } from "../types";

export interface ZoneConfig {
    baseTokens: Partial<Token>[];
    defenseMultiplier?: number;
    errorChance?: number;
}

const sys = (type: TokenType, count: number = 1, quality: number = 30): Partial<Token>[] => 
    Array(Math.floor(count)).fill({ type, quality, duration: 5 });

export const ZONES_CONFIG: Record<string, ZoneConfig> = {
    // --- AILES : Centres et Dribbles ---
    "1,0": { baseTokens: [...sys('DRIBBLE', 2), ...sys('PASS', 1)] },
    "2,0": { baseTokens: [...sys('DRIBBLE', 3), ...sys('PASS', 2), ...sys('CROSS', 1)] },
    "3,0": { baseTokens: [...sys('DRIBBLE', 3), ...sys('PASS', 2), ...sys('CROSS', 1)] },
    "4,0": { baseTokens: [...sys('DRIBBLE', 2), ...sys('CROSS', 2)] },
    "1,4": { baseTokens: [...sys('DRIBBLE', 2), ...sys('PASS', 1)] },
    "2,4": { baseTokens: [...sys('DRIBBLE', 3), ...sys('PASS', 2), ...sys('CROSS', 1)] },
    "3,4": { baseTokens: [...sys('DRIBBLE', 3), ...sys('PASS', 2), ...sys('CROSS', 1)] },
    "4,4": { baseTokens: [...sys('DRIBBLE', 2), ...sys('CROSS', 2)] },

    // --- AXE : Construction et Danger ---
    "1,2": { baseTokens: [...sys('PASS', 4), ...sys('INTERCEPT', 2)] },
    "2,2": { baseTokens: [...sys('PASS', 5), ...sys('THROUGH_BALL', 1)] },
    "3,2": { baseTokens: [...sys('PASS', 4), ...sys('THROUGH_BALL', 2), ...sys('FOUL', 1)] },
    "4,2": { baseTokens: [...sys('PASS', 2), ...sys('SHOOT_GOAL', 1, 50), ...sys('SHOOT_SAVED', 1), ...sys('FOUL', 1)] },

    // --- SURFACES (Gardiens) ---
    "0,2": { baseTokens: [...sys('SAVE', 5), ...sys('TACKLE', 3)], defenseMultiplier: 2.0 },
    "5,2": { baseTokens: [...sys('SAVE', 5), ...sys('TACKLE', 3)], defenseMultiplier: 2.0 },
};

export const DEFAULT_ZONE_CONFIG: ZoneConfig = {
    baseTokens: [
        ...sys('PASS', 2), 
        ...sys('NEUTRAL_POSSESSION', 1),
        ...sys('ERROR', 1), 
        ...sys('FOUL', 1) 
    ],
    defenseMultiplier: 1.0,
    errorChance: 1.0
};
