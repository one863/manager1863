import { Token, GridPosition, TokenType } from "../types";

export interface ZoneConfig {
    baseTokens: Partial<Token>[];
    defenseMultiplier?: number;
    errorChance?: number;
}

/**
 * ZONES_CONFIG NEUTRE
 * On ne définit plus de jetons ici pour laisser la TACTIQUE (Roles) 
 * être la seule source de jetons dans le sac.
 */
export const ZONES_CONFIG: Record<string, ZoneConfig> = {
    // On garde uniquement des multiplicateurs ou des règles spéciales par zone si besoin
    "0,2": { baseTokens: [], defenseMultiplier: 2.0 }, // But Home
    "5,2": { baseTokens: [], defenseMultiplier: 2.0 }, // But Away
};

export const DEFAULT_ZONE_CONFIG: ZoneConfig = {
    baseTokens: [], // Vide par défaut
    defenseMultiplier: 1.0,
    errorChance: 1.0
};
