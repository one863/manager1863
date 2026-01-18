import type { TeamRatings, TacticType } from "./types";

export type TacticEffect = {
	midfield?: number;
	attackLeft?: number;
	attackCenter?: number;
	attackRight?: number;
	defenseLeft?: number;
	defenseCenter?: number;
	defenseRight?: number;
	// Metadata pour l'UI
	label: string;
	description: string;
};

export const TACTIC_DEFINITIONS: Record<TacticType, TacticEffect> = {
	NORMAL: {
		label: "Équilibré",
		description: "Système standard sans prise de risque majeure.",
	},
	PRESSING: {
		midfield: 1.15,
		defenseCenter: 0.95,
		label: "Haut Pressing",
		description: "Étouffe l'adversaire au milieu mais fatigue plus vite et expose la charnière.",
	},
	CA: {
		midfield: 0.85,
		defenseCenter: 1.2,
		label: "Contre-Attaque",
		description: "Bloc bas solide. Exploite les transitions rapides après récupération.",
	},
	AOW: {
		attackCenter: 0.7,
		attackLeft: 1.3,
		attackRight: 1.3,
		midfield: 1.05,
		label: "Attaque sur les Ailes",
		description: "Étire le bloc adverse en passant par les débordements latéraux.",
	},
	AIM: {
		attackCenter: 1.35,
		attackLeft: 0.7,
		attackRight: 0.7,
		midfield: 1.1,
		label: "Attaque Plein Axe",
		description: "Privilégie le jeu court et les combinaisons centrales.",
	},
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
	"4-5-1": { GK: 1, DEF: 4, MID: 5, FWD: 1 }, // Nouveau: Ultra-défensif / Tenir le score
	"2-3-5": { GK: 1, DEF: 2, MID: 3, FWD: 5 }, // Nouveau: Historique "Pyramide" / Tout pour l'attaque
};
