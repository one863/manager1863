// Ce fichier génère les données d'affichage UI à partir de formations-config.ts
// Source unique : src/core/engine/token-engine/config/formations-config.ts

import { FORMATIONS as ENGINE_FORMATIONS, ROLE_ZONES, getFormationRoles } from "./engine/token-engine/formations-config";

/**
 * Génère les positions visuelles pour une formation à partir des zones du moteur
 * Utilise la zone active principale de chaque rôle
 */
function generateFormationPositions(formationId: string): { x: number; y: number; role: string }[] {
    const roles = getFormationRoles(formationId);
    
    return roles.map(role => {
        const zones = ROLE_ZONES[role];
        if (!zones || zones.active.length === 0) {
            // Fallback au centre
            return { x: 2, y: 2, role };
        }
        // Prend la première zone active comme position principale
        const mainZone = zones.active[0];
        return { x: mainZone.x, y: mainZone.y, role };
    });
}

// Génère FORMATIONS pour l'UI à partir des données du moteur
export const FORMATIONS: Record<string, { positions: { x: number; y: number; role: string }[] }> = 
    Object.fromEntries(
        Object.keys(ENGINE_FORMATIONS).map(key => [
            key,
            { positions: generateFormationPositions(key) }
        ])
    );

export type FormationKey = keyof typeof FORMATIONS;
