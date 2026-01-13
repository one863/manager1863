import { TeamRatings } from './types';

export type TacticEffect = {
  midfield?: number;
  attackLeft?: number;
  attackCenter?: number;
  attackRight?: number;
  defenseLeft?: number;
  defenseCenter?: number;
  defenseRight?: number;
};

export const TACTIC_DEFINITIONS: Record<TeamRatings['tacticType'], TacticEffect> = {
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
  }
};

export const FORMATIONS: Record<string, { GK: number, DEF: number, MID: number, FWD: number }> = {
  '1-1-8': { GK: 1, DEF: 1, MID: 1, FWD: 8 },
  '1-2-7': { GK: 1, DEF: 1, MID: 2, FWD: 7 },
  '2-2-6': { GK: 1, DEF: 2, MID: 2, FWD: 6 },
  '2-3-5': { GK: 1, DEF: 2, MID: 3, FWD: 5 }, // Formation historique de 1863
  'WM':    { GK: 1, DEF: 3, MID: 4, FWD: 3 }, // The WM (Chapman)
  '4-4-2': { GK: 1, DEF: 4, MID: 4, FWD: 2 },
  '4-3-3': { GK: 1, DEF: 4, MID: 3, FWD: 3 },
  '5-3-2': { GK: 1, DEF: 5, MID: 3, FWD: 2 },
  '3-5-2': { GK: 1, DEF: 3, MID: 5, FWD: 2 },
};
