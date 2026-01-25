import { TokenType } from "../types";

export interface RoleTokenDef {
    type: TokenType;
    count: number;
    weight: number; // Multiplicateur de qualité
}

export interface RoleConfig {
    baseTokens: RoleTokenDef[];
}

export const ROLES_CONFIG: Record<string, RoleConfig> = {
    "GK": {
        baseTokens: [
            { type: 'SAVE', count: 10, weight: 1.2 },
            { type: 'PASS', count: 5, weight: 0.7 }
        ]
    },
    "DC": {
        baseTokens: [
            { type: 'TACKLE', count: 8, weight: 1.1 },
            { type: 'INTERCEPT', count: 6, weight: 1.0 },
            { type: 'PASS', count: 4, weight: 0.8 },
            { type: 'ERROR', count: 2, weight: 1.0 }
        ]
    },
    "DL": {
        baseTokens: [
            { type: 'TACKLE', count: 5, weight: 1.0 },
            { type: 'PASS', count: 6, weight: 1.0 },
            { type: 'DRIBBLE', count: 4, weight: 1.1 }
        ]
    },
    "DR": {
        baseTokens: [
            { type: 'TACKLE', count: 5, weight: 1.0 },
            { type: 'PASS', count: 6, weight: 1.0 },
            { type: 'DRIBBLE', count: 4, weight: 1.1 }
        ]
    },
    "MC": {
        baseTokens: [
            { type: 'PASS', count: 12, weight: 1.1 },
            { type: 'COMBO_PASS', count: 4, weight: 1.0 },
            { type: 'TACKLE', count: 4, weight: 0.9 },
            { type: 'INTERCEPT', count: 4, weight: 1.0 }
        ]
    },
    "ML": {
        baseTokens: [
            { type: 'PASS', count: 8, weight: 1.0 },
            { type: 'DRIBBLE', count: 7, weight: 1.2 },
            { type: 'COMBO_PASS', count: 3, weight: 1.0 }
        ]
    },
    "MR": {
        baseTokens: [
            { type: 'PASS', count: 8, weight: 1.0 },
            { type: 'DRIBBLE', count: 7, weight: 1.2 },
            { type: 'COMBO_PASS', count: 3, weight: 1.0 }
        ]
    },
    "ST": {
        baseTokens: [
            { type: 'SHOOT_GOAL', count: 8, weight: 1.3 },
            { type: 'DRIBBLE', count: 5, weight: 1.0 },
            { type: 'PASS', count: 3, weight: 0.7 },
            { type: 'SHOOT_OFF_TARGET', count: 3, weight: 1.0 }
        ]
    },
    "LW": {
        baseTokens: [
            { type: 'DRIBBLE', count: 10, weight: 1.3 },
            { type: 'SHOOT_GOAL', count: 4, weight: 1.1 },
            { type: 'PASS', count: 5, weight: 0.9 }
        ]
    },
    "RW": {
        baseTokens: [
            { type: 'DRIBBLE', count: 10, weight: 1.3 },
            { type: 'SHOOT_GOAL', count: 4, weight: 1.1 },
            { type: 'PASS', count: 5, weight: 0.9 }
        ]
    }
};
