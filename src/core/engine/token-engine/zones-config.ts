// /src/core/engine/token-engine/zones-config.ts
import { Token } from "./types";

export interface ZoneDefinitionSplit {
    offenseTokensHome: Partial<Token>[];
    defenseTokensHome: Partial<Token>[];
    offenseTokensAway: Partial<Token>[];
    defenseTokensAway: Partial<Token>[];
}

// === Bundles offensifs avec narrativeTemplate ===
const OFF_BUILDUP = [
    { type: 'PASS_SHORT', narrativeTemplate: '{p1} joue court pour construire.' },
    { type: 'PASS_LATERAL', narrativeTemplate: '{p1} écarte le jeu sur l\'aile.' },
    { type: 'PASS_BACK', narrativeTemplate: '{p1} temporise en jouant en retrait.' },
    { type: 'PASS_LONG', narrativeTemplate: '{p1} tente une longue ouverture vers l\'avant.' }
];

const OFF_MIDFIELD = [
    { type: 'PASS_SHORT', narrativeTemplate: '{p1} combine avec une passe courte.' },
    { type: 'DRIBBLE', narrativeTemplate: '{p1} tente de percer plein axe balle au pied.' },
    { type: 'PASS_THROUGH', narrativeTemplate: '{p1} cherche la profondeur d\'une passe tranchante.' },
    { type: 'PASS_LATERAL', narrativeTemplate: '{p1} écarte le jeu pour étirer le bloc.' }
];

const OFF_ATTACK = [
    { type: 'DRIBBLE', narrativeTemplate: '{p1} provoque la défense balle au pied.' },
    { type: 'PASS_THROUGH', narrativeTemplate: '{p1} glisse une passe chirurgicale dans la surface.' },
    { type: 'PASS_EXTRA', narrativeTemplate: '{p1} tente la passe de trop dans la zone de vérité.' },
    { type: 'CROSS', narrativeTemplate: '{p1} centre fort devant le but !' },
    { type: 'CUT_INSIDE', narrativeTemplate: '{p1} repique dans l\'axe pour se mettre sur son bon pied.' },
    { type: 'SHOOT_GOAL', narrativeTemplate: '{p1} déclenche une frappe terrible !' },
    { type: 'SHOOT_SAVED', narrativeTemplate: '{p1} prend sa chance mais bute sur le gardien !' },
    { type: 'SHOOT_OFF', narrativeTemplate: 'La tentative de {p1} passe largement au-dessus.' },
    { type: 'DRIBBLE_SHOT', narrativeTemplate: '{p1} efface son vis-à-vis et tente sa chance !' }
];

const OFF_FINISH = [
    { type: 'DRIBBLE', narrativeTemplate: '{p1} tente de déborder dans les derniers mètres.' },
    { type: 'PASS_THROUGH', narrativeTemplate: '{p1} cherche la faille dans la défense.' },
    { type: 'PASS_EXTRA', narrativeTemplate: '{p1} tente une remise risquée.' },
    { type: 'CROSS', narrativeTemplate: '{p1} envoie un centre dangereux !' },
    { type: 'CUT_INSIDE', narrativeTemplate: '{p1} rentre intérieur pour frapper.' },
    { type: 'SHOOT_GOAL', narrativeTemplate: '{p1} arme une frappe instantanée !' },
    { type: 'SHOOT_SAVED', narrativeTemplate: 'Quel arrêt du portier face à {p1} !' },
    { type: 'SHOOT_OFF', narrativeTemplate: '{p1} dévisse complètement sa frappe.' },
    { type: 'DRIBBLE_SHOT', narrativeTemplate: '{p1} s\'ouvre le chemin du but et tire !' }
];

// === Bundles défensifs avec narrativeTemplate ===
const DEF_STANDARD = [
    { type: 'TACKLE', narrativeTemplate: '{p1} intervient avec un tacle propre.' },
    { type: 'INTERCEPT', narrativeTemplate: '{p1} coupe la trajectoire et intercepte.' }
];

const DEF_DENSE = [
    { type: 'TACKLE', narrativeTemplate: '{p1} s\'interpose avec autorité.' },
    { type: 'INTERCEPT', narrativeTemplate: '{p1} lit bien le jeu et intercepte.' },
    { type: 'BLOCK_SHOT', narrativeTemplate: '{p1} se jette au dernier moment pour contrer !' }
];

const DEF_LOW_BLOCK = [
    { type: 'BLOCK_SHOT', narrativeTemplate: '{p1} fait mur devant sa cage !' },
    { type: 'CLEARANCE', narrativeTemplate: '{p1} dégage le ballon en catastrophe !' }
];

const GK_DISTRIBUTION = [
    { type: 'GK_SHORT', narrativeTemplate: '{p1} relance proprement à la main.' },
    { type: 'GK_LONG', narrativeTemplate: '{p1} allonge le jeu au pied.' }
];

// === Grille 6x5 ===
export const ZONES_CONFIG: Record<string, ZoneDefinitionSplit> = {
    // Colonne 0 : Zone critique Home (Défense basse Home / Attaque Away)
    '0,0': { offenseTokensHome: OFF_BUILDUP, defenseTokensHome: DEF_LOW_BLOCK, offenseTokensAway: OFF_ATTACK, defenseTokensAway: DEF_DENSE },
    '0,1': { offenseTokensHome: OFF_BUILDUP, defenseTokensHome: DEF_LOW_BLOCK, offenseTokensAway: OFF_FINISH, defenseTokensAway: DEF_DENSE },
    '0,2': { offenseTokensHome: GK_DISTRIBUTION, defenseTokensHome: DEF_LOW_BLOCK, offenseTokensAway: OFF_FINISH, defenseTokensAway: DEF_DENSE },
    '0,3': { offenseTokensHome: OFF_BUILDUP, defenseTokensHome: DEF_LOW_BLOCK, offenseTokensAway: OFF_FINISH, defenseTokensAway: DEF_DENSE },
    '0,4': { offenseTokensHome: OFF_BUILDUP, defenseTokensHome: DEF_LOW_BLOCK, offenseTokensAway: OFF_ATTACK, defenseTokensAway: DEF_DENSE },

    // Colonne 1 : Filtre défensif Home
    '1,0': { offenseTokensHome: OFF_BUILDUP, defenseTokensHome: DEF_DENSE, offenseTokensAway: OFF_ATTACK, defenseTokensAway: DEF_STANDARD },
    '1,1': { offenseTokensHome: OFF_BUILDUP, defenseTokensHome: DEF_DENSE, offenseTokensAway: OFF_MIDFIELD, defenseTokensAway: DEF_STANDARD },
    '1,2': { offenseTokensHome: OFF_BUILDUP, defenseTokensHome: DEF_DENSE, offenseTokensAway: OFF_MIDFIELD, defenseTokensAway: DEF_STANDARD },
    '1,3': { offenseTokensHome: OFF_BUILDUP, defenseTokensHome: DEF_DENSE, offenseTokensAway: OFF_MIDFIELD, defenseTokensAway: DEF_STANDARD },
    '1,4': { offenseTokensHome: OFF_BUILDUP, defenseTokensHome: DEF_DENSE, offenseTokensAway: OFF_ATTACK, defenseTokensAway: DEF_STANDARD },

    // Colonnes 2 & 3 : Milieu de terrain
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

    // Colonne 4 : Filtre défensif Away
    '4,0': { offenseTokensHome: OFF_ATTACK, defenseTokensHome: DEF_STANDARD, offenseTokensAway: OFF_BUILDUP, defenseTokensAway: DEF_DENSE },
    '4,1': { offenseTokensHome: OFF_MIDFIELD, defenseTokensHome: DEF_STANDARD, offenseTokensAway: OFF_BUILDUP, defenseTokensAway: DEF_DENSE },
    '4,2': { offenseTokensHome: OFF_MIDFIELD, defenseTokensHome: DEF_STANDARD, offenseTokensAway: OFF_BUILDUP, defenseTokensAway: DEF_DENSE },
    '4,3': { offenseTokensHome: OFF_MIDFIELD, defenseTokensHome: DEF_STANDARD, offenseTokensAway: OFF_BUILDUP, defenseTokensAway: DEF_DENSE },
    '4,4': { offenseTokensHome: OFF_ATTACK, defenseTokensHome: DEF_STANDARD, offenseTokensAway: OFF_BUILDUP, defenseTokensAway: DEF_DENSE },

    // Colonne 5 : Zone critique Away (Attaque Home / Défense basse Away)
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