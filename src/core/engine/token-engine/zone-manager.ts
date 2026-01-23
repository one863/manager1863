import { GridPosition, Token, ZoneData } from "./types";
import { ZONES_CONFIG, DEFAULT_ZONE_CONFIG } from "./config/zones-config";

export class ZoneManager {
    private zones: Map<string, ZoneData> = new Map();

    constructor() {
        this.initializeZones();
    }

    private initializeZones() {
        for (let x = 0; x < 6; x++) {
            for (let y = 0; y < 5; y++) {
                const id = `${x},${y}`;
                const config = ZONES_CONFIG[id] || DEFAULT_ZONE_CONFIG;
                
                this.zones.set(id, {
                    id,
                    baseTokens: this.mapConfigToTokens(id, config.baseTokens),
                    logic: {
                        defenseMultiplier: config.defenseMultiplier || DEFAULT_ZONE_CONFIG.defenseMultiplier!,
                        errorChance: config.errorChance || DEFAULT_ZONE_CONFIG.errorChance!
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
            quality: pt.quality || 50,
            duration: pt.duration || 5
        }));
    }

    public getZone(pos: GridPosition): ZoneData {
        const id = `${pos.x},${pos.y}`;
        return this.zones.get(id) || this.zones.get("2,2")!; // Fallback sécurité
    }
}
