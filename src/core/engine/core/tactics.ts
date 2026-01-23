import type { TacticType } from "./types";

export type TacticEffect = {
	midfield?: number;
	attackCenter?: number;
	attackWings?: number;
	defenseCenter?: number;
	defenseWings?: number;
	label: string;
	description: string;
};

export const TACTIC_DEFINITIONS: Record<TacticType, TacticEffect> = {
	NORMAL: { label: "Équilibré", description: "Système standard." },
	PRESSING: { midfield: 1.15, defenseCenter: 0.95, label: "Haut Pressing", description: "Bloc haut et agressif." },
	CA: { midfield: 0.85, defenseCenter: 1.2, label: "Contre-Attaque", description: "Bloc bas et projection rapide." },
	AOW: { attackWings: 1.25, attackCenter: 0.8, midfield: 1.05, label: "Attaque sur les Ailes", description: "Jeu écarté." },
	AIM: { attackCenter: 1.3, attackWings: 0.85, midfield: 1.1, label: "Attaque Plein Axe", description: "Combinaisons centrales." },
};

export type FormationKey = 
	| "4-4-2" | "4-3-3" | "3-5-2" | "3-4-3" | "4-2-4" 
	| "5-4-1" | "4-5-1" | "2-3-5";

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
