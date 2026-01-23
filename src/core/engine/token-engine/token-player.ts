import { Token, TokenPlayerState, TokenType, GridPosition } from "./types";
import { ROLES_CONFIG } from "./config/roles-config";

export class TokenPlayer {
  public id: number; public name: string; public teamId: number; public role: string;
  public activeZones: string[] = []; public reachZones: string[] = []; 
  public fatigue: number = 0; public confidence: number = 50; 
  
  private baseZones: GridPosition[] = [];
  private stock: Token[] = [];
  private stats: TokenPlayerState['stats'];

  constructor(state: TokenPlayerState) {
    this.id = state.id; this.name = state.name; this.teamId = state.teamId;
    this.role = state.role; this.stats = state.stats;
    this.initializeStock();
  }

  public setBaseInfluence(zones: GridPosition[]) { this.baseZones = zones; }

  public updateInfluence(_ballX: number, isHome: boolean) {
    const active = new Set<string>(); const reach = new Set<string>();
    this.baseZones.forEach(z => {
        let x = z.x; let y = z.y;
        if (!isHome) { x = 5 - x; y = 4 - y; }
        const key = `${x},${y}`; active.add(key);
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const nx = x + dx; const ny = y + dy;
                if (nx >= 0 && nx <= 5 && ny >= 0 && ny <= 4) {
                    const nKey = `${nx},${ny}`; if (!active.has(nKey)) reach.add(nKey);
                }
            }
        }
    });
    this.activeZones = Array.from(active); this.reachZones = Array.from(reach);
  }

  private initializeStock() {
    const roleDef = ROLES_CONFIG[this.role] || ROLES_CONFIG["MC"];
    roleDef.baseTokens.forEach(def => {
        const count = def.type === ('SHOOT' as any) ? def.count * 1.5 : def.count;
        for (let i = 0; i < Math.max(1, count); i++) {
            this.stock.push({
                id: crypto.randomUUID(), type: this.mapOldType(def.type),
                ownerId: this.id, teamId: this.teamId,
                quality: 50, duration: 8 + Math.floor(Math.random() * 4)
            });
        }
    });
  }

  private mapOldType(type: any): TokenType {
      if (type === 'SHOOT') return 'SHOOT_GOAL'; // Sera fragmenté dynamiquement si besoin
      return type as TokenType;
  }

  public getTokensForBag(intensity: number = 1.0): Token[] {
    const modifier = 1 + (this.confidence - 50) / 100 - Math.max(0, this.fatigue - 50) / 150;
    const pullCount = Math.floor((this.fatigue > 70 ? 7 : 12) * intensity);
    return [...this.stock].sort(() => Math.random() - 0.5).slice(0, Math.max(1, pullCount))
        .map(t => ({ ...t, quality: Math.min(99, Math.max(1, t.quality * modifier)) }));
  }

  public updateMental(impact: 'SUCCESS' | 'FAIL' | 'GOAL_PRO' | 'GOAL_CON') {
    if (impact === 'SUCCESS') this.confidence = Math.min(100, this.confidence + 1);
    if (impact === 'FAIL') this.confidence = Math.max(0, this.confidence - 2);
    if (impact === 'GOAL_PRO') this.confidence = Math.min(100, this.confidence + 15);
    if (impact === 'GOAL_CON') this.confidence = Math.max(0, this.confidence - 10);
  }

  public applyFatigue(amount: number = 1) { this.fatigue += amount; }
}
