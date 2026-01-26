import { GridPosition } from "../types";

/**
 * Configuration des formations et zones d'influence
 * 
 * GRILLE 6x5 (x=0-5, y=0-4):
 *   x=0 → But HOME (home défend)
 *   x=5 → But AWAY (away défend)
 *   y=0, y=4 → Ailes
 *   y=1, y=2, y=3 → Axe central
 * 
 * Les zones sont définies pour HOME (attaque vers x=5)
 * Pour AWAY, elles seront inversées automatiquement (miroir x = 5-x)
 */

export interface RoleZones {
    active: GridPosition[];   // Zones principales (weight = 1.0)
    reach: GridPosition[];    // Zones secondaires (weight = 0.5)
}

export interface FormationConfig {
    name: string;
    roles: string[];  // 11 rôles dans l'ordre (GK en premier)
    description: string;
    style: 'defensive' | 'balanced' | 'attacking';
}

// ============================================
// ZONES PAR RÔLE (pour HOME, attaque vers x=5)
// ============================================

export const ROLE_ZONES: Record<string, RoleZones> = {
    // --- GARDIEN ---
    "GK": {
        active: [{ x: 0, y: 2 }],
        reach: [{ x: 0, y: 1 }, { x: 0, y: 3 }, { x: 1, y: 2 }]
    },

    // --- DÉFENSEURS ---
    "DC": {
        active: [{ x: 1, y: 1 }, { x: 1, y: 2 }, { x: 1, y: 3 }],
        reach: [{ x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 }, { x: 2, y: 2 }]
    },
    "DCL": {  // Défenseur central gauche
        active: [{ x: 1, y: 1 }, { x: 1, y: 2 }],
        reach: [{ x: 0, y: 1 }, { x: 0, y: 2 }, { x: 2, y: 1 }]
    },
    "DCR": {  // Défenseur central droit
        active: [{ x: 1, y: 2 }, { x: 1, y: 3 }],
        reach: [{ x: 0, y: 2 }, { x: 0, y: 3 }, { x: 2, y: 3 }]
    },
    "DL": {  // Latéral gauche
        active: [{ x: 1, y: 0 }, { x: 2, y: 0 }],
        reach: [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 3, y: 0 }]
    },
    "DR": {  // Latéral droit
        active: [{ x: 1, y: 4 }, { x: 2, y: 4 }],
        reach: [{ x: 0, y: 4 }, { x: 1, y: 3 }, { x: 3, y: 4 }]
    },
    "LWB": {  // Piston gauche (formation 3-5-2)
        active: [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }],
        reach: [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 2, y: 1 }]
    },
    "RWB": {  // Piston droit (formation 3-5-2)
        active: [{ x: 1, y: 4 }, { x: 2, y: 4 }, { x: 3, y: 4 }],
        reach: [{ x: 0, y: 4 }, { x: 4, y: 4 }, { x: 2, y: 3 }]
    },

    // --- MILIEUX DÉFENSIFS ---
    "DM": {  // Milieu défensif (sentinelle)
        active: [{ x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 }],
        reach: [{ x: 1, y: 1 }, { x: 1, y: 2 }, { x: 1, y: 3 }, { x: 3, y: 2 }]
    },

    // --- MILIEUX CENTRAUX ---
    "MC": {
        active: [{ x: 2, y: 2 }, { x: 3, y: 2 }],
        reach: [{ x: 2, y: 1 }, { x: 2, y: 3 }, { x: 3, y: 1 }, { x: 3, y: 3 }, { x: 4, y: 2 }]
    },
    "MCL": {  // Milieu central gauche
        active: [{ x: 2, y: 1 }, { x: 3, y: 1 }],
        reach: [{ x: 2, y: 2 }, { x: 3, y: 2 }, { x: 2, y: 0 }]
    },
    "MCR": {  // Milieu central droit
        active: [{ x: 2, y: 3 }, { x: 3, y: 3 }],
        reach: [{ x: 2, y: 2 }, { x: 3, y: 2 }, { x: 2, y: 4 }]
    },

    // --- MILIEUX LATÉRAUX ---
    "ML": {  // Milieu gauche
        active: [{ x: 2, y: 0 }, { x: 3, y: 0 }],
        reach: [{ x: 1, y: 0 }, { x: 4, y: 0 }, { x: 2, y: 1 }, { x: 3, y: 1 }]
    },
    "MR": {  // Milieu droit
        active: [{ x: 2, y: 4 }, { x: 3, y: 4 }],
        reach: [{ x: 1, y: 4 }, { x: 4, y: 4 }, { x: 2, y: 3 }, { x: 3, y: 3 }]
    },

    // --- MILIEUX OFFENSIFS ---
    "AMC": {  // Meneur de jeu
        active: [{ x: 3, y: 2 }, { x: 4, y: 2 }],
        reach: [{ x: 3, y: 1 }, { x: 3, y: 3 }, { x: 4, y: 1 }, { x: 4, y: 3 }, { x: 5, y: 2 }]
    },
    "AML": {  // Ailier gauche offensif
        active: [{ x: 3, y: 0 }, { x: 4, y: 0 }],
        reach: [{ x: 2, y: 0 }, { x: 5, y: 0 }, { x: 4, y: 1 }, { x: 5, y: 1 }]
    },
    "AMR": {  // Ailier droit offensif
        active: [{ x: 3, y: 4 }, { x: 4, y: 4 }],
        reach: [{ x: 2, y: 4 }, { x: 5, y: 4 }, { x: 4, y: 3 }, { x: 5, y: 3 }]
    },

    // --- AILIERS (WINGERS) ---
    "LW": {  // Ailier gauche
        active: [{ x: 4, y: 0 }, { x: 5, y: 0 }],
        reach: [{ x: 3, y: 0 }, { x: 4, y: 1 }, { x: 5, y: 1 }]
    },
    "RW": {  // Ailier droit
        active: [{ x: 4, y: 4 }, { x: 5, y: 4 }],
        reach: [{ x: 3, y: 4 }, { x: 4, y: 3 }, { x: 5, y: 3 }]
    },

    // --- ATTAQUANTS ---
    "ST": {  // Attaquant de pointe
        active: [{ x: 4, y: 2 }, { x: 5, y: 1 }, { x: 5, y: 2 }, { x: 5, y: 3 }],
        reach: [{ x: 3, y: 2 }, { x: 4, y: 1 }, { x: 4, y: 3 }]
    },
    "STL": {  // Attaquant gauche (duo)
        active: [{ x: 4, y: 1 }, { x: 5, y: 1 }, { x: 5, y: 2 }],
        reach: [{ x: 3, y: 1 }, { x: 4, y: 2 }, { x: 5, y: 0 }]
    },
    "STR": {  // Attaquant droit (duo)
        active: [{ x: 4, y: 3 }, { x: 5, y: 2 }, { x: 5, y: 3 }],
        reach: [{ x: 3, y: 3 }, { x: 4, y: 2 }, { x: 5, y: 4 }]
    },
    "CF": {  // Avant-centre (faux 9)
        active: [{ x: 3, y: 2 }, { x: 4, y: 2 }],
        reach: [{ x: 3, y: 1 }, { x: 3, y: 3 }, { x: 5, y: 1 }, { x: 5, y: 2 }, { x: 5, y: 3 }]
    }
};

// ============================================
// FORMATIONS
// ============================================

export const FORMATIONS: Record<string, FormationConfig> = {
    "4-4-2": {
        name: "4-4-2 Classique",
        roles: ["GK", "DL", "DCL", "DCR", "DR", "ML", "MCL", "MCR", "MR", "STL", "STR"],
        description: "Formation équilibrée classique avec deux attaquants",
        style: "balanced"
    },
    "4-4-2-flat": {
        name: "4-4-2 Plat",
        roles: ["GK", "DL", "DCL", "DCR", "DR", "ML", "MC", "MC", "MR", "STL", "STR"],
        description: "Milieu à 4 très compact",
        style: "defensive"
    },
    "4-3-3": {
        name: "4-3-3",
        roles: ["GK", "DL", "DCL", "DCR", "DR", "MCL", "MC", "MCR", "LW", "ST", "RW"],
        description: "Formation offensive avec ailiers hauts",
        style: "attacking"
    },
    "4-2-3-1": {
        name: "4-2-3-1",
        roles: ["GK", "DL", "DCL", "DCR", "DR", "DM", "DM", "AML", "AMC", "AMR", "ST"],
        description: "Double pivot défensif et meneur de jeu",
        style: "balanced"
    },
    "3-5-2": {
        name: "3-5-2",
        roles: ["GK", "DCL", "DC", "DCR", "LWB", "MCL", "MC", "MCR", "RWB", "STL", "STR"],
        description: "Trois défenseurs avec pistons",
        style: "attacking"
    },
    "3-4-3": {
        name: "3-4-3",
        roles: ["GK", "DCL", "DC", "DCR", "LWB", "MC", "MC", "RWB", "LW", "ST", "RW"],
        description: "Formation très offensive",
        style: "attacking"
    },
    "5-3-2": {
        name: "5-3-2",
        roles: ["GK", "LWB", "DCL", "DC", "DCR", "RWB", "MCL", "MC", "MCR", "STL", "STR"],
        description: "Cinq défenseurs, compact",
        style: "defensive"
    },
    "4-5-1": {
        name: "4-5-1",
        roles: ["GK", "DL", "DCL", "DCR", "DR", "ML", "MCL", "MC", "MCR", "MR", "ST"],
        description: "Milieu renforcé, attaquant isolé",
        style: "defensive"
    },
    "4-1-4-1": {
        name: "4-1-4-1",
        roles: ["GK", "DL", "DCL", "DCR", "DR", "DM", "ML", "MC", "MC", "MR", "ST"],
        description: "Sentinelle devant la défense",
        style: "balanced"
    }
};

// Formation par défaut
export const DEFAULT_FORMATION = "4-4-2";

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

/**
 * Inverse les zones pour l'équipe AWAY (miroir horizontal)
 * x devient 5-x
 */
export function mirrorZonesForAway(zones: RoleZones): RoleZones {
    return {
        active: zones.active.map(z => ({ x: 5 - z.x, y: z.y })),
        reach: zones.reach.map(z => ({ x: 5 - z.x, y: z.y }))
    };
}

/**
 * Récupère les zones d'un rôle pour une équipe
 */
export function getZonesForRole(role: string, isHome: boolean): RoleZones {
    const baseZones = ROLE_ZONES[role] || ROLE_ZONES["MC"];
    return isHome ? baseZones : mirrorZonesForAway(baseZones);
}

/**
 * Récupère les rôles d'une formation
 */
export function getFormationRoles(formationId: string): string[] {
    return FORMATIONS[formationId]?.roles || FORMATIONS[DEFAULT_FORMATION].roles;
}

// Legacy export pour compatibilité
export const FORMATION_ROLES: Record<string, string[]> = Object.fromEntries(
    Object.entries(FORMATIONS).map(([key, config]) => [key, config.roles])
);
