import { Token, TokenPlayerState, TokenType, GridPosition } from "./types";
import { ROLES_CONFIG } from "./config/roles-config";

export class TokenPlayer {
  public id: number;
  public name: string;
  public teamId: number;
  public role: string;
  public influenceZones: string[] = []; 
  public fatigue: number = 0; 
  private baseZones: GridPosition[] = [];
  
  private stock: Token[] = [];
  private stats: TokenPlayerState['stats'];

  constructor(state: TokenPlayerState) {
    this.id = state.id;
    this.name = state.name;
    this.teamId = state.teamId;
    this.role = state.role;
    this.stats = state.stats;
    this.initializeStock();
  }

  /**
   * Définit les zones d'influence tactiques de base (définies par la formation)
   */
  public setBaseInfluence(zones: GridPosition[]) {
    this.baseZones = zones;
  }

  /**
   * Calcule les zones d'influence réelles en fonction de la position (isHome)
   */
  public updateInfluence(_ballX: number, isHome: boolean) {
    this.influenceZones = this.baseZones.map(z => {
        let x = z.x;
        let y = z.y;
        if (!isHome) {
            x = 5 - x;
            y = 4 - y;
        }
        return `${x},${y}`;
    });
  }

  private initializeStock() {
    const roleDef = ROLES_CONFIG[this.role] || ROLES_CONFIG["MC"];
    
    roleDef.baseTokens.forEach(def => {
        let count = def.count;
        const relevantStat = this.getRelevantStat(def.type);
        const quality = Math.floor(relevantStat * 4 * def.weight);

        for (let i = 0; i < Math.max(1, count); i++) {
            this.stock.push({
                id: crypto.randomUUID(),
                type: def.type,
                ownerId: this.id,
                teamId: this.teamId,
                quality: Math.min(99, quality),
                duration: 8 + Math.floor(Math.random() * 4)
            });
        }
    });
  }

  private getRelevantStat(type: TokenType): number {
      switch(type) {
          case 'PASS': 
          case 'DRIBBLE': 
          case 'COMBO_PASS': return (this.stats.technical + this.stats.mental) / 2;
          case 'SHOOT': return (this.stats.finishing + this.stats.mental) / 2;
          case 'TACKLE': 
          case 'INTERCEPT': return (this.stats.defense + this.stats.physical) / 2;
          case 'SAVE': return this.stats.goalkeeping;
          default: return 10;
      }
  }

  public getTokensForBag(): Token[] {
    const pullCount = this.fatigue > 60 ? 8 : 12;
    
    const tokens = [...this.stock]
        .sort(() => Math.random() - 0.5)
        .slice(0, pullCount);

    if (this.fatigue > 40) {
        const errorCount = Math.floor((this.fatigue - 30) / 15);
        for (let i = 0; i < errorCount; i++) {
            tokens.push({
                id: `dyn-error-${this.id}-${i}`,
                type: 'ERROR',
                ownerId: this.id,
                teamId: this.teamId,
                quality: 0,
                duration: 4
            });
        }
    }

    return tokens;
  }

  public applyFatigue(amount: number = 1) {
    this.fatigue += amount;
  }
}
