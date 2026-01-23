// Ce fichier sert principalement à l'affichage UI des positions sur le terrain.
// Pour le moteur de simulation, voir src/core/engine/token-engine/tactics-data.ts

export const FORMATIONS: Record<string, { positions: { x: number; y: number; role: string }[] }> = {
    "4-4-2": {
        positions: [
            { x: 0, y: 2, role: "GK" },
            { x: 1, y: 0, role: "DL" }, { x: 1, y: 1, role: "DC" }, { x: 1, y: 3, role: "DC" }, { x: 1, y: 4, role: "DR" },
            { x: 3, y: 0, role: "ML" }, { x: 3, y: 1, role: "MC" }, { x: 3, y: 3, role: "MC" }, { x: 3, y: 4, role: "MR" },
            { x: 5, y: 1, role: "ST" }, { x: 5, y: 3, role: "ST" }
        ]
    },
    "4-3-3": {
        positions: [
            { x: 0, y: 2, role: "GK" },
            { x: 1, y: 0, role: "DL" }, { x: 1, y: 1, role: "DC" }, { x: 1, y: 3, role: "DC" }, { x: 1, y: 4, role: "DR" },
            { x: 3, y: 1, role: "MC" }, { x: 3, y: 2, role: "MC" }, { x: 3, y: 3, role: "MC" },
            { x: 5, y: 0, role: "LW" }, { x: 5, y: 2, role: "ST" }, { x: 5, y: 4, role: "RW" }
        ]
    }
};

export type FormationKey = keyof typeof FORMATIONS;
