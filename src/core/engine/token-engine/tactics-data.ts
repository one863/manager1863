import { TacticType, TacticTemplate, GridPosition } from "./types";

/**
 * Définit les zones d'influence pour chaque rôle.
 * Une zone est un string "x,y"
 */
const INFLUENCE_MAP: Record<string, GridPosition[]> = {
    "GK":  [{ x: 0, y: 2 }, { x: 0, y: 1 }, { x: 0, y: 3 }],
    "DL":  [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 1 }],
    "DR":  [{ x: 1, y: 4 }, { x: 2, y: 4 }, { x: 1, y: 3 }],
    "DC":  [{ x: 1, y: 1 }, { x: 1, y: 2 }, { x: 1, y: 3 }, { x: 2, y: 2 }],
    "DMC": [{ x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 }, { x: 1, y: 2 }],
    "ML":  [{ x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 }],
    "MR":  [{ x: 2, y: 4 }, { x: 3, y: 4 }, { x: 4, y: 4 }],
    "MC":  [{ x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 }, { x: 3, y: 1 }, { x: 3, y: 2 }, { x: 3, y: 3 }],
    "AML": [{ x: 3, y: 0 }, { x: 4, y: 0 }, { x: 5, y: 1 }],
    "AMR": [{ x: 3, y: 4 }, { x: 4, y: 4 }, { x: 5, y: 3 }],
    "AMC": [{ x: 3, y: 2 }, { x: 4, y: 1 }, { x: 4, y: 2 }, { x: 4, y: 3 }],
    "LW":  [{ x: 4, y: 0 }, { x: 5, y: 0 }, { x: 5, y: 1 }],
    "RW":  [{ x: 4, y: 4 }, { x: 5, y: 4 }, { x: 5, y: 3 }],
    "ST":  [{ x: 4, y: 1 }, { x: 4, y: 2 }, { x: 4, y: 3 }, { x: 5, y: 2 }],
};

export const TACTIC_TEMPLATES: Record<string, TacticTemplate> = {
    "4-4-2": {
        name: "442" as any,
        roles: {
            0: { label: "GK", zones: INFLUENCE_MAP["GK"] },
            1: { label: "DL", zones: INFLUENCE_MAP["DL"] },
            2: { label: "DC", zones: INFLUENCE_MAP["DC"] },
            3: { label: "DC", zones: INFLUENCE_MAP["DC"] },
            4: { label: "DR", zones: INFLUENCE_MAP["DR"] },
            5: { label: "ML", zones: INFLUENCE_MAP["ML"] },
            6: { label: "MC", zones: INFLUENCE_MAP["MC"] },
            7: { label: "MC", zones: INFLUENCE_MAP["MC"] },
            8: { label: "MR", zones: INFLUENCE_MAP["MR"] },
            9: { label: "ST", zones: INFLUENCE_MAP["ST"] },
            10: { label: "ST", zones: INFLUENCE_MAP["ST"] },
        }
    },
    "4-3-3": {
        name: "433" as any,
        roles: {
            0: { label: "GK", zones: INFLUENCE_MAP["GK"] },
            1: { label: "DL", zones: INFLUENCE_MAP["DL"] },
            2: { label: "DC", zones: INFLUENCE_MAP["DC"] },
            3: { label: "DC", zones: INFLUENCE_MAP["DC"] },
            4: { label: "DR", zones: INFLUENCE_MAP["DR"] },
            5: { label: "MC", zones: INFLUENCE_MAP["MC"] },
            6: { label: "MC", zones: INFLUENCE_MAP["MC"] },
            7: { label: "MC", zones: INFLUENCE_MAP["MC"] },
            8: { label: "LW", zones: INFLUENCE_MAP["LW"] },
            9: { label: "ST", zones: INFLUENCE_MAP["ST"] },
            10: { label: "RW", zones: INFLUENCE_MAP["RW"] },
        }
    }
};
