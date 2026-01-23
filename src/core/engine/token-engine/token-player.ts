import { GridPosition, Token, TokenPlayerState, TokenType } from "./types";

export class TokenPlayer {
  public id: number;
  public teamId: number;
  public position: GridPosition;
  public fatigue: number = 0;
  public role: string; // NOUVEAU
  
  private stock: Map<TokenType, Token[]>;
  private originalStats: TokenPlayerState['stats'];

  constructor(state: TokenPlayerState) {
    this.id = state.id;
    this.teamId = state.teamId;
    this.position = state.position;
    this.role = state.role; // NOUVEAU
    this.originalStats = state.stats;
    this.stock = new Map();
    
    this.initializeStock();
  }

  private initializeStock() {
    // RE-BALANCING DU "DECK" DU JOUEUR (V2)
    this.generateTokens('PASS', Math.max(5, this.originalStats.passing), 4);
    this.generateTokens('SHOOT', Math.ceil(this.originalStats.shooting / 5), 2);
    this.generateTokens('DRIBBLE', Math.ceil(this.originalStats.dribbling / 3), 5);
    this.generateTokens('TACKLE', Math.ceil(this.originalStats.tackling / 2), 3);
    this.generateTokens('INTERCEPT', Math.ceil(this.originalStats.positioning / 2), 3);

    const technical = (this.originalStats.passing + this.originalStats.dribbling) / 2;
    const errorCount = Math.max(1, Math.floor((20 - technical) / 3));
    this.generateTokens('ERROR', errorCount, 2);

    const fatigueCount = Math.max(0, 20 - this.originalStats.stamina);
    this.generateTokens('FATIGUE', fatigueCount, 0); 
  }

  private generateTokens(type: TokenType, count: number, duration: number) {
    const tokens: Token[] = [];
    for (let i = 0; i < count; i++) {
      tokens.push({
        id: crypto.randomUUID(),
        type,
        ownerId: this.id,
        teamId: this.teamId,
        quality: 50, 
        duration: duration
      });
    }
    this.stock.set(type, tokens);
  }

  public getTokensForBag(ratio: number): Token[] {
    const output: Token[] = [];
    this.stock.forEach((tokens) => {
      const count = Math.ceil(tokens.length * ratio);
      const shuffled = [...tokens].sort(() => Math.random() - 0.5);
      output.push(...shuffled.slice(0, count));
    });
    return output;
  }

  public applyFatigue() {
    const actionTypes: TokenType[] = ['PASS', 'DRIBBLE', 'TACKLE', 'SHOOT'];
    const randomType = actionTypes[Math.floor(Math.random() * actionTypes.length)];
    
    const tokens = this.stock.get(randomType);
    if (tokens && tokens.length > 0) {
        tokens.pop();
    }
    this.fatigue += 1;
  }
}
