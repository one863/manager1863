import { Token } from "./types";

export interface ZoneDefinitionSplit {
	offenseTokensHome: Partial<Token>[];
	defenseTokensHome: Partial<Token>[];
	offenseTokensAway: Partial<Token>[];
	defenseTokensAway: Partial<Token>[];
}

// === Bundles offensifs/défensifs ===
const OFF_BUILDUP = [
	{ type: 'PASS_SHORT' }, { type: 'PASS_LATERAL' }, { type: 'PASS_BACK' }, { type: 'PASS_LONG' }
];
const OFF_MIDFIELD = [
	{ type: 'PASS_SHORT' }, { type: 'DRIBBLE' }, { type: 'PASS_THROUGH' }, { type: 'PASS_LATERAL' }
];
const OFF_ATTACK = [
	{ type: 'DRIBBLE' }, { type: 'PASS_THROUGH' }, { type: 'PASS_EXTRA' },
	{ type: 'CROSS' }, { type: 'CUT_INSIDE' },
	{ type: 'SHOOT_GOAL' }, { type: 'SHOOT_SAVED' }, { type: 'SHOOT_OFF' }, { type: 'DRIBBLE_SHOT' }
];
const OFF_FINISH = [
	{ type: 'DRIBBLE' }, { type: 'PASS_THROUGH' }, { type: 'PASS_EXTRA' },
	{ type: 'CROSS' }, { type: 'CUT_INSIDE' },
	{ type: 'SHOOT_GOAL' }, { type: 'SHOOT_SAVED' }, { type: 'SHOOT_OFF' }, { type: 'DRIBBLE_SHOT' }
];
const DEF_STANDARD = [
	{ type: 'TACKLE' }, { type: 'INTERCEPT' }
];
const DEF_DENSE = [
	{ type: 'TACKLE' }, { type: 'INTERCEPT' }, { type: 'BLOCK_SHOT' }
];
const DEF_LOW_BLOCK = [
	{ type: 'BLOCK_SHOT' }, { type: 'CLEARANCE' }
];
const GK_DISTRIBUTION = [
	{ type: 'GK_SHORT' }, { type: 'GK_LONG' }
];

// === Grille 6x5 ===
export const ZONES_CONFIG: Record<string, ZoneDefinitionSplit> = {
	// Colonne 0 : zone critique home
	'0,0': { offenseTokensHome: OFF_BUILDUP, defenseTokensHome: DEF_LOW_BLOCK, offenseTokensAway: OFF_ATTACK, defenseTokensAway: DEF_DENSE },
	'0,1': { offenseTokensHome: OFF_BUILDUP, defenseTokensHome: DEF_LOW_BLOCK, offenseTokensAway: OFF_FINISH, defenseTokensAway: DEF_DENSE },
	'0,2': { offenseTokensHome: GK_DISTRIBUTION, defenseTokensHome: DEF_LOW_BLOCK, offenseTokensAway: OFF_FINISH, defenseTokensAway: DEF_DENSE },
	'0,3': { offenseTokensHome: OFF_BUILDUP, defenseTokensHome: DEF_LOW_BLOCK, offenseTokensAway: OFF_FINISH, defenseTokensAway: DEF_DENSE },
	'0,4': { offenseTokensHome: OFF_BUILDUP, defenseTokensHome: DEF_LOW_BLOCK, offenseTokensAway: OFF_ATTACK, defenseTokensAway: DEF_DENSE },

	// Colonne 1 : filtre défensif home
	'1,0': { offenseTokensHome: OFF_BUILDUP, defenseTokensHome: DEF_DENSE, offenseTokensAway: OFF_ATTACK, defenseTokensAway: DEF_STANDARD },
	'1,1': { offenseTokensHome: OFF_BUILDUP, defenseTokensHome: DEF_DENSE, offenseTokensAway: OFF_MIDFIELD, defenseTokensAway: DEF_STANDARD },
	'1,2': { offenseTokensHome: OFF_BUILDUP, defenseTokensHome: DEF_DENSE, offenseTokensAway: OFF_MIDFIELD, defenseTokensAway: DEF_STANDARD },
	'1,3': { offenseTokensHome: OFF_BUILDUP, defenseTokensHome: DEF_DENSE, offenseTokensAway: OFF_MIDFIELD, defenseTokensAway: DEF_STANDARD },
	'1,4': { offenseTokensHome: OFF_BUILDUP, defenseTokensHome: DEF_DENSE, offenseTokensAway: OFF_ATTACK, defenseTokensAway: DEF_STANDARD },

	// Colonnes 2 & 3 : milieu
	'2,0': { offenseTokensHome: OFF_MIDFIELD, defenseTokensHome: DEF_STANDARD, offenseTokensAway: OFF_MIDFIELD, defenseTokensAway: DEF_STANDARD },
	'2,1': { offenseTokensHome: OFF_MIDFIELD, defenseTokensHome: DEF_STANDARD, offenseTokensAway: OFF_MIDFIELD, defenseTokensAway: DEF_STANDARD },
	'2,2': { offenseTokensHome: OFF_MIDFIELD, defenseTokensHome: DEF_STANDARD, offenseTokensAway: OFF_MIDFIELD, defenseTokensAway: DEF_STANDARD },
	'2,3': { offenseTokensHome: OFF_MIDFIELD, defenseTokensHome: DEF_STANDARD, offenseTokensAway: OFF_MIDFIELD, defenseTokensAway: DEF_STANDARD },
	'2,4': { offenseTokensHome: OFF_MIDFIELD, defenseTokensHome: DEF_STANDARD, offenseTokensAway: OFF_MIDFIELD, defenseTokensAway: DEF_STANDARD },

	'3,0': { offenseTokensHome: OFF_MIDFIELD, defenseTokensHome: DEF_STANDARD, offenseTokensAway: OFF_MIDFIELD, defenseTokensAway: DEF_STANDARD },
	'3,1': { offenseTokensHome: OFF_MIDFIELD, defenseTokensHome: DEF_STANDARD, offenseTokensAway: OFF_MIDFIELD, defenseTokensAway: DEF_STANDARD },
	'3,2': { offenseTokensHome: OFF_MIDFIELD, defenseTokensHome: DEF_STANDARD, offenseTokensAway: OFF_MIDFIELD, defenseTokensAway: DEF_STANDARD },
	'3,3': { offenseTokensHome: OFF_MIDFIELD, defenseTokensHome: DEF_STANDARD, offenseTokensAway: OFF_MIDFIELD, defenseTokensAway: DEF_STANDARD },
	'3,4': { offenseTokensHome: OFF_MIDFIELD, defenseTokensHome: DEF_STANDARD, offenseTokensAway: OFF_MIDFIELD, defenseTokensAway: DEF_STANDARD },

	// Colonne 4 : filtre défensif away
	'4,0': { offenseTokensHome: OFF_ATTACK, defenseTokensHome: DEF_STANDARD, offenseTokensAway: OFF_BUILDUP, defenseTokensAway: DEF_DENSE },
	'4,1': { offenseTokensHome: OFF_MIDFIELD, defenseTokensHome: DEF_STANDARD, offenseTokensAway: OFF_BUILDUP, defenseTokensAway: DEF_DENSE },
	'4,2': { offenseTokensHome: OFF_MIDFIELD, defenseTokensHome: DEF_STANDARD, offenseTokensAway: OFF_BUILDUP, defenseTokensAway: DEF_DENSE },
	'4,3': { offenseTokensHome: OFF_MIDFIELD, defenseTokensHome: DEF_STANDARD, offenseTokensAway: OFF_BUILDUP, defenseTokensAway: DEF_DENSE },
	'4,4': { offenseTokensHome: OFF_ATTACK, defenseTokensHome: DEF_STANDARD, offenseTokensAway: OFF_BUILDUP, defenseTokensAway: DEF_DENSE },

	// Colonne 5 : zone critique away
	'5,0': { offenseTokensHome: OFF_ATTACK, defenseTokensHome: DEF_DENSE, offenseTokensAway: OFF_BUILDUP, defenseTokensAway: DEF_LOW_BLOCK },
	'5,1': { offenseTokensHome: OFF_FINISH, defenseTokensHome: DEF_DENSE, offenseTokensAway: OFF_BUILDUP, defenseTokensAway: DEF_LOW_BLOCK },
	'5,2': { offenseTokensHome: OFF_FINISH, defenseTokensHome: DEF_DENSE, offenseTokensAway: GK_DISTRIBUTION, defenseTokensAway: DEF_LOW_BLOCK },
	'5,3': { offenseTokensHome: OFF_FINISH, defenseTokensHome: DEF_DENSE, offenseTokensAway: OFF_BUILDUP, defenseTokensAway: DEF_LOW_BLOCK },
	'5,4': { offenseTokensHome: OFF_ATTACK, defenseTokensHome: DEF_DENSE, offenseTokensAway: OFF_BUILDUP, defenseTokensAway: DEF_LOW_BLOCK },
};

export const DEFAULT_ZONE_CONFIG: ZoneDefinitionSplit = {
	offenseTokensHome: OFF_MIDFIELD,
	defenseTokensHome: DEF_STANDARD,
	offenseTokensAway: OFF_MIDFIELD,
	defenseTokensAway: DEF_STANDARD
};
