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
                // Génère tous les tokens système pour la zone (pour debug/affichage)
                const baseTokens: Token[] = [];
                if (config) {
                    // Ajoute tous les tokens système (pour les deux camps)
                    [
                        ...(config.offenseTokensHome || []),
                        ...(config.defenseTokensHome || []),
                        ...(config.offenseTokensAway || []),
                        ...(config.defenseTokensAway || [])
                    ].forEach((pt, i) => {
                        if (!pt.type) return;
                        baseTokens.push({
                            id: `sys-${id}-${pt.type}-${i}`,
                            type: pt.type as any,
                            ownerId: 0,
                            teamId: 0, // Système (pour debug, à adapter si besoin)
                            duration: pt.duration || 5
                        });
                    });
                }
                this.zones.set(id, {
                    id,
                    baseTokens,
                    logic: {
                        errorChance: 0
                    }
                });
            }
        }
    }

    private mapConfigToTokens(zoneId: string, partialTokens: any[]): Token[] {
        return partialTokens.map((pt, index) => ({
            id: `base-${zoneId}-${index}`,
            type: pt.type,
            ownerId: 0, // Système
            teamId: 0,  // Neutre
            duration: pt.duration || 5
        }));
    }

    public getZone(pos: GridPosition): ZoneData {
        const id = `${pos.x},${pos.y}`;
        return this.zones.get(id) || this.zones.get("2,2")!; // Fallback sécurité
    }
}
