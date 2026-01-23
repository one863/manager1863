import { TokenType } from "../types";

export interface FormationModifier {
    defense: number;
    attack: number;
    possession: number;
}

export interface FormationConfig {
    collectiveTokens: { type: TokenType; count: number }[];
    modifiers: FormationModifier;
}

export const FORMATIONS_CONFIG: Record<string, FormationConfig> = {
    "4-4-2": {
        collectiveTokens: [
            { type: 'PASS', count: 10 },
            { type: 'INTERCEPT', count: 5 }
        ],
        modifiers: { defense: 1.0, attack: 1.0, possession: 1.0 }
    },
    "4-3-3": {
        collectiveTokens: [
            { type: 'PASS', count: 15 },
            { type: 'COMBO_PASS', count: 5 }
        ],
        modifiers: { defense: 0.9, attack: 1.2, possession: 1.1 }
    }
};
