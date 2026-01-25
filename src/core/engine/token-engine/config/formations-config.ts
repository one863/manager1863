import { GridPosition } from "../types";

export interface RoleZones {
    active: GridPosition[];
    reach: GridPosition[];
}

export const ROLE_ZONES: Record<string, RoleZones> = {
    "GK": {
        active: [{ x: 0, y: 2 }],
        reach: [{ x: 0, y: 1 }, { x: 0, y: 3 }, { x: 1, y: 1 }, { x: 1, y: 2 }, { x: 1, y: 3 }]
    },
    "DC": {
        active: [{ x: 1, y: 1 }, { x: 1, y: 2 }, { x: 1, y: 3 }],
        reach: [{ x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 }, { x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 }]
    },
    "DL": {
        active: [{ x: 1, y: 0 }, { x: 2, y: 0 }],
        reach: [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 0 }]
    },
    "DR": {
        active: [{ x: 1, y: 4 }, { x: 2, y: 4 }],
        reach: [{ x: 1, y: 3 }, { x: 2, y: 3 }, { x: 3, y: 4 }]
    },
    "MC": {
        active: [{ x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 }, { x: 3, y: 1 }, { x: 3, y: 2 }, { x: 3, y: 3 }],
        reach: [{ x: 1, y: 1 }, { x: 1, y: 2 }, { x: 1, y: 3 }, { x: 4, y: 1 }, { x: 4, y: 2 }, { x: 4, y: 3 }]
    },
    "ML": {
        active: [{ x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 }],
        reach: [{ x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 }]
    },
    "MR": {
        active: [{ x: 2, y: 4 }, { x: 3, y: 4 }, { x: 4, y: 4 }],
        reach: [{ x: 2, y: 3 }, { x: 3, y: 3 }, { x: 4, y: 3 }]
    },
    "ST": {
        active: [{ x: 4, y: 1 }, { x: 4, y: 2 }, { x: 4, y: 3 }, { x: 5, y: 2 }],
        reach: [
            { x: 3, y: 1 }, { x: 3, y: 2 }, { x: 3, y: 3 },
            { x: 5, y: 1 }, { x: 5, y: 2 }, { x: 5, y: 3 }, // surface away
            { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 }  // surface home (pour away)
        ]
    },
    "AMC": {
        active: [{ x: 3, y: 2 }, { x: 4, y: 1 }, { x: 4, y: 2 }, { x: 4, y: 3 }],
        reach: [
            { x: 2, y: 2 }, { x: 3, y: 1 }, { x: 3, y: 3 },
            { x: 4, y: 1 }, { x: 4, y: 2 }, { x: 4, y: 3 },
            { x: 5, y: 1 }, { x: 5, y: 2 }, { x: 5, y: 3 },
            { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 }
        ]
    },
    "AML": {
        active: [{ x: 3, y: 0 }, { x: 4, y: 0 }, { x: 5, y: 1 }],
        reach: [
            { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 }, { x: 5, y: 0 }, { x: 5, y: 1 },
            { x: 0, y: 1 }, { x: 0, y: 2 }
        ]
    },
    "AMR": {
        active: [{ x: 3, y: 4 }, { x: 4, y: 4 }, { x: 5, y: 3 }],
        reach: [
            { x: 2, y: 4 }, { x: 3, y: 4 }, { x: 4, y: 4 }, { x: 5, y: 4 }, { x: 5, y: 3 },
            { x: 0, y: 2 }, { x: 0, y: 3 }
        ]
    },
    "LW": {
        active: [{ x: 4, y: 0 }, { x: 5, y: 0 }, { x: 5, y: 1 }],
        reach: [
            { x: 3, y: 0 }, { x: 4, y: 0 }, { x: 5, y: 0 }, { x: 5, y: 1 },
            { x: 0, y: 1 }
        ]
    },
    "RW": {
        active: [{ x: 4, y: 4 }, { x: 5, y: 4 }, { x: 5, y: 3 }],
        reach: [
            { x: 3, y: 4 }, { x: 4, y: 4 }, { x: 5, y: 4 }, { x: 5, y: 3 },
            { x: 0, y: 3 }
        ]
    }
};

export const FORMATION_ROLES: Record<string, string[]> = {
    "4-4-2": ["GK", "DL", "DC", "DC", "DR", "ML", "MC", "MC", "MR", "ST", "ST"],
    "4-3-3": ["GK", "DL", "DC", "DC", "DR", "MC", "MC", "MC", "ML", "ST", "MR"]
};
