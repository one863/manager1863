import type { TeamRatings } from "./types";

export type TacticEffect = {
	midfield?: number;
	attackLeft?: number;
	attackCenter?: number;
	attackRight?: number;
	defenseLeft?: number;
	defenseCenter?: number;
	defenseRight?: number;
};

export const TACTIC_DEFINITIONS: Record<
	TeamRatings["tacticType"],
	TacticEffect
> = {
	NORMAL: {},
	PRESSING: {
		midfield: 1.1,
	},
	CA: {
		midfield: 0.9,
		defenseCenter: 1.1,
	},
	AOW: {
		attackCenter: 0.75,
		attackLeft: 1.25,
		attackRight: 1.25,
		defenseCenter: 0.9,
	},
	AIM: {
		attackCenter: 1.25,
		attackLeft: 0.75,
		attackRight: 0.75,
		defenseCenter: 0.9,
	},
};

export const FORMATIONS: Record<
	string,
	{ GK: number; DEF: number; MID: number; FWD: number }
> = {
	"4-4-2": { GK: 1, DEF: 4, MID: 4, FWD: 2 },
	"4-3-3": { GK: 1, DEF: 4, MID: 3, FWD: 3 },
	"3-5-2": { GK: 1, DEF: 3, MID: 5, FWD: 2 },
	"3-4-3": { GK: 1, DEF: 3, MID: 4, FWD: 3 },
	"4-2-4": { GK: 1, DEF: 4, MID: 2, FWD: 4 },
	"5-4-1": { GK: 1, DEF: 5, MID: 4, FWD: 1 },
};
