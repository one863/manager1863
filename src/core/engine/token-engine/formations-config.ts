// formations-config.ts — Strictement typé, minimal, pour moteur zone

export type FormationRole = "GK" | "DEF" | "MID" | "FWD";

export const FORMATIONS: Record<string, FormationRole[]> = {
  "4-4-2": ["GK", "DEF", "DEF", "DEF", "DEF", "MID", "MID", "MID", "MID", "FWD", "FWD"],
  "4-3-3": ["GK", "DEF", "DEF", "DEF", "DEF", "MID", "MID", "MID", "FWD", "FWD", "FWD"],
  "3-5-2": ["GK", "DEF", "DEF", "DEF", "MID", "MID", "MID", "MID", "MID", "FWD", "FWD"],
  "5-3-2": ["GK", "DEF", "DEF", "DEF", "DEF", "DEF", "MID", "MID", "MID", "FWD", "FWD"],
  "4-2-3-1": ["GK", "DEF", "DEF", "DEF", "DEF", "MID", "MID", "MID", "MID", "MID", "FWD"],
};

export const DEFAULT_FORMATION = "4-4-2";

export function getFormationRoles(formation: string): FormationRole[] {
  return FORMATIONS[formation] || FORMATIONS[DEFAULT_FORMATION];
}

// Pour compatibilité UI (zones fictives par rôle)
export const ROLE_ZONES: Record<FormationRole, { active: { x: number; y: number }[] }> = {
  GK: { active: [{ x: 0, y: 2 }, { x: 5, y: 2 }] },
  DEF: { active: [{ x: 1, y: 3 }, { x: 2, y: 3 }, { x: 3, y: 3 }, { x: 4, y: 3 }] },
  MID: { active: [{ x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 2 }] },
  FWD: { active: [{ x: 2, y: 1 }, { x: 3, y: 1 }] },
};
