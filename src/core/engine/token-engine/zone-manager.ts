import { GridPosition, Token, ZoneData } from "./types";
import { ZONES_CONFIG } from "./config/zones-config";

export class ZoneManager {
    private zones: Map<string, ZoneData> = new Map();

    constructor() {
        this.initializeZones();
    }

    private initializeZones() {
        for (let x = 0; x < 6; x++) {
            for (let y = 0; y < 5; y++) {
                const id = `${x},${y}`;
                const config = ZONES_CONFIG[id];
                
                const baseTokens: Token[] = [];
                if (config) {
                    // On garde une trace des rôles autorisés dans cette zone
                    const allPartial = [
                        ...config.offenseTokensHome, ...config.defenseTokensHome,
                        ...config.offenseTokensAway, ...config.defenseTokensAway
                    ];

                    allPartial.forEach((pt, i) => {
                        if (!pt.type) return;
                        baseTokens.push({
                            id: `template-${id}-${pt.role}-${i}`,
                            type: pt.type,
                            ownerId: 0,
                            teamId: 0,
                            duration: pt.duration || 5,
                            role: pt.role // On stocke le rôle pour savoir QUI peut agir ici
                        });
                    });
                }

                this.zones.set(id, {
                    id,
                    baseTokens,
                    logic: {
                        // On pourrait ajouter des multiplicateurs de fatigue par zone (ex: boue)
                        errorChance: (x === 0 || x === 5) ? 0.05 : 0 // Plus de stress près des buts
                    }
                });
            }
        }
    }

    /**
     * Retourne les rôles théoriquement actifs dans cette zone.
     * Utile pour l'UI pour afficher "Zone d'influence de : ST, DC"
     */
    public getAllowedRolesInZone(pos: GridPosition): string[] {
        const zone = this.getZone(pos);
        const roles = zone.baseTokens.map(t => t.role).filter(Boolean) as string[];
        return [...new Set(roles)]; // Unicité
    }

    public getZone(pos: GridPosition): ZoneData {
        const id = `${pos.x},${pos.y}`;
        return this.zones.get(id) || this.zones.get("2,2")!; 
    }
}