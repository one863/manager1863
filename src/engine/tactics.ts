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
