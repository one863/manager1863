import type { TeamRatings, TacticType } from "./types";

export type TacticEffect = {
	midfield?: number;
	attackLeft?: number;
	attackCenter?: number;
	attackRight?: number;
	defenseLeft?: number;
	defenseCenter?: number;
	defenseRight?: number;
	label: string;
	description: string;
};

export const TACTIC_DEFINITIONS: Record<TacticType, TacticEffect> = {
	NORMAL: { label: "Équilibré", description: "Système standard." },
	PRESSING: { midfield: 1.15, defenseCenter: 0.95, label: "Haut Pressing", description: "Bloc haut et agressif." },
	CA: { midfield: 0.85, defenseCenter: 1.2, label: "Contre-Attaque", description: "Bloc bas et projection rapide." },
	AOW: { attackCenter: 0.7, attackLeft: 1.3, attackRight: 1.3, midfield: 1.05, label: "Attaque sur les Ailes", description: "Jeu écarté." },
	AIM: { attackCenter: 1.35, attackLeft: 0.7, attackRight: 0.7, midfield: 1.1, label: "Attaque Plein Axe", description: "Combinaisons centrales." },
};

export type FormationKey = 
	| "4-4-2" | "4-3-3" | "3-5-2" | "3-4-3" | "4-2-4" 
	| "5-4-1" | "4-5-1" | "2-3-5";

/**
 * MOTEUR TACTIQUE V7 (Grille 6x5 = 30 Zones)
 * Progression (X dans UI) : 6 colonnes (0 à 5)
 * Largeur (Y dans UI) : 5 rangées (0 à 4)
 * Index : 1 à 30
 */
export const PITCH_GRID = {
    ROWS: 6,
    COLS: 5,
    TOTAL_ZONES: 30,
};

export interface ZoneContribution {
    zoneId: number;
    weight: number;
}

// Positions fixes des joueurs sur la grille (Point de vue HOME)
// Rappel index : (Row * 5) + Col + 1
export const FORMATION_POSITIONS: Record<FormationKey, number[]> = {
    "4-4-2": [3, 6, 7, 9, 10, 16, 17, 19, 20, 27, 29], 
    "4-3-3": [3, 6, 7, 9, 10, 13, 17, 19, 21, 23, 25],
    "3-5-2": [3, 7, 8, 9, 11, 13, 15, 17, 19, 27, 29],
    "3-4-3": [3, 7, 8, 9, 11, 15, 17, 19, 26, 28, 30],
    "4-2-4": [3, 6, 7, 9, 10, 17, 19, 21, 23, 27, 29],
    "5-4-1": [3, 6, 7, 8, 9, 10, 12, 14, 17, 19, 28], 
    "4-5-1": [3, 6, 7, 9, 10, 12, 13, 14, 16, 20, 28],
    "2-3-5": [3, 7, 9, 13, 17, 19, 26, 27, 28, 29, 30]
};

export const FORMATION_ROLES: Record<FormationKey, string[]> = {
    "4-4-2": ["GK", "LB", "CB", "CB", "RB", "LM", "CM", "CM", "RM", "ST", "ST"],
    "4-3-3": ["GK", "LB", "CB", "CB", "RB", "CDM", "CM", "CM", "LW", "ST", "RW"],
    "3-5-2": ["GK", "CB", "CB", "CB", "LWB", "CDM", "CAM", "CM", "RWB", "ST", "ST"],
    "3-4-3": ["GK", "CB", "CB", "CB", "LM", "CM", "CM", "RM", "LW", "ST", "RW"],
    "4-2-4": ["GK", "LB", "CB", "CB", "RB", "CM", "CM", "LW", "ST", "ST", "RW"],
    "5-4-1": ["GK", "LWB", "CB", "CB", "CB", "RWB", "CDM", "CM", "LM", "RM", "ST"],
    "4-5-1": ["GK", "LB", "CB", "CB", "RB", "CDM", "CM", "CM", "LM", "RM", "ST"],
    "2-3-5": ["GK", "CB", "CB", "CDM", "CM", "CAM", "LW", "ST", "ST", "ST", "RW"]
};

export const ROLE_ZONE_INFLUENCE: Record<string, { att: ZoneContribution[], def: ZoneContribution[] }> = {
    GK: {
        att: [{ zoneId: 3, weight: 1.0 }], 
        def: [{ zoneId: 3, weight: 1.5 }, { zoneId: 8, weight: 0.5 }]
    },
    LB: {
        att: [{ zoneId: 6, weight: 0.8 }, { zoneId: 11, weight: 0.6 }, { zoneId: 16, weight: 0.3 }],
        def: [{ zoneId: 6, weight: 1.0 }, { zoneId: 1, weight: 0.8 }, { zoneId: 11, weight: 0.4 }]
    },
    RB: {
        att: [{ zoneId: 10, weight: 0.8 }, { zoneId: 15, weight: 0.6 }, { zoneId: 20, weight: 0.3 }],
        def: [{ zoneId: 10, weight: 1.0 }, { zoneId: 5, weight: 0.8 }, { zoneId: 15, weight: 0.4 }]
    },
    CB: {
        att: [{ zoneId: 8, weight: 0.5 }], 
        def: [{ zoneId: 8, weight: 1.2 }, { zoneId: 3, weight: 1.0 }, { zoneId: 7, weight: 0.8 }, { zoneId: 9, weight: 0.8 }]
    },
    CDM: {
        att: [{ zoneId: 13, weight: 0.8 }, { zoneId: 8, weight: 0.6 }],
        def: [{ zoneId: 13, weight: 1.2 }, { zoneId: 8, weight: 1.0 }, { zoneId: 3, weight: 0.3 }]
    },
    CM: {
        att: [{ zoneId: 13, weight: 0.8 }, { zoneId: 18, weight: 0.8 }],
        def: [{ zoneId: 13, weight: 1.0 }, { zoneId: 8, weight: 0.6 }]
    },
    LM: {
        att: [{ zoneId: 11, weight: 0.6 }, { zoneId: 16, weight: 0.8 }, { zoneId: 21, weight: 0.5 }],
        def: [{ zoneId: 11, weight: 0.8 }, { zoneId: 6, weight: 0.6 }]
    },
    RM: {
        att: [{ zoneId: 15, weight: 0.6 }, { zoneId: 20, weight: 0.8 }, { zoneId: 25, weight: 0.5 }],
        def: [{ zoneId: 15, weight: 0.8 }, { zoneId: 10, weight: 0.6 }]
    },
    LW: {
        att: [{ zoneId: 21, weight: 1.0 }, { zoneId: 26, weight: 0.8 }],
        def: [{ zoneId: 16, weight: 0.5 }, { zoneId: 11, weight: 0.3 }]
    },
    RW: {
        att: [{ zoneId: 25, weight: 1.0 }, { zoneId: 30, weight: 0.8 }],
        def: [{ zoneId: 20, weight: 0.5 }, { zoneId: 15, weight: 0.3 }]
    },
    ST: {
        att: [{ zoneId: 28, weight: 1.2 }, { zoneId: 23, weight: 0.8 }, { zoneId: 27, weight: 0.6 }, { zoneId: 29, weight: 0.6 }],
        def: [{ zoneId: 23, weight: 0.4 }]
    }
};

export const FORMATIONS: Record<
	FormationKey,
	{ GK: number; DEF: number; MID: number; FWD: number }
> = {
	"4-4-2": { GK: 1, DEF: 4, MID: 4, FWD: 2 },
	"4-3-3": { GK: 1, DEF: 4, MID: 3, FWD: 3 },
	"3-5-2": { GK: 1, DEF: 3, MID: 5, FWD: 2 },
	"3-4-3": { GK: 1, DEF: 3, MID: 4, FWD: 3 },
	"4-2-4": { GK: 1, DEF: 4, MID: 2, FWD: 4 },
	"5-4-1": { GK: 1, DEF: 5, MID: 4, FWD: 1 },
	"4-5-1": { GK: 1, DEF: 4, MID: 5, FWD: 1 }, 
	"2-3-5": { GK: 1, DEF: 2, MID: 3, FWD: 5 }, 
};
