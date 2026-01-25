import { Token, TokenType, GridPosition } from "./types";

export class TokenPlayer {
  public id: number;
  public name: string;
  public teamId: number;
  public stats: any;
  public influence: { atk: number; def: number } = { atk: 1, def: 1 };
  public activeZones: string[] = [];
  public reachZones: string[] = [];

  constructor(data: any) {
    this.id = data.id;
    this.name = data.name;
    this.teamId = data.teamId;
    this.stats = data.stats;
  }

  public setBaseInfluence(atk: number, def: number) {
    this.influence = { atk, def };
  }

  public setTacticalZones(active: GridPosition[], reach: GridPosition[]) {
    this.activeZones = (active || []).map(z => `${z.x},${z.y}`);
    this.reachZones = (reach || []).map(z => `${z.x},${z.y}`);
  }

  public updateInfluence(ballX: number, ballY: number, isHome: boolean) {
    let centerX = 2, centerY = 2;
    if (this.activeZones.length > 0) {
        const parts = this.activeZones[0].split(',');
        centerX = parseInt(parts[0]);
        centerY = parseInt(parts[1]);
    }

    const dist = Math.sqrt(Math.pow(ballX - centerX, 2) + Math.pow(ballY - centerY, 2));
    const factor = Math.max(0.2, 1.2 - dist * 0.2);

    this.influence.atk = (this.stats.technical || 10) * factor;
    this.influence.def = (this.stats.defense || 10) * factor;
  }

  public getOffensiveTokens(weight: number, pos: GridPosition): Token[] {
    const tokens: Token[] = [];
    const tech = this.influence.atk * weight;
    const finishing = (this.stats.finishing || 10) * weight;
    
    // Déduction du camp adverse
    const isHomeTeam = this.teamId === 1; // Hypothèse simplifiée
    const targetX = isHomeTeam ? 5 : 0;
    const isInFinalThird = Math.abs(targetX - pos.x) <= 1;

    // 1. DILUTION MASSIVE (Standard Opta)
    // On multiplie les passes pour réduire le poids relatif des tirs/buts
    const shortCount = Math.max(5, Math.round(tech * 1.5)); // ~30 jetons pour tech=20
    const backCount = Math.max(2, Math.round(tech / 4));
    
    for (let i = 0; i < shortCount; i++) tokens.push(this.createToken('PASS_SHORT', 10));
    for (let i = 0; i < backCount; i++) tokens.push(this.createToken('PASS_BACK', 8));

    if (!isInFinalThird) {
        const longCount = Math.max(1, Math.round(tech / 4));
        for (let i = 0; i < longCount; i++) tokens.push(this.createToken('PASS_LONG', 12));
    }

    // 2. DRIBBLES (Risque/Récompense)
    const dribbleCount = Math.max(0, Math.round(tech / 8));
    for (let i = 0; i < dribbleCount; i++) {
        tokens.push(this.createToken('DRIBBLE', 15));
        tokens.push(this.createToken('DRIBBLE_LOST', 10)); 
    }
    
    // 3. TIRS (Loi de la Finition Équilibrée)
    if (isInFinalThird && finishing > 5) {
        // Pour 1 but, on veut statistiquement beaucoup plus de tirs ratés ou arrêtés
        tokens.push(this.createToken('SHOOT_GOAL', 20));       // 1 jeton BUT
        for(let i=0; i<4; i++) tokens.push(this.createToken('SHOOT_SAVED', 15)); // 4 jetons ARRÊT
        for(let i=0; i<8; i++) tokens.push(this.createToken('SHOOT_OFF_TARGET', 10)); // 8 jetons RATÉ
    }
    
    return tokens;
  }

  public getDefensiveTokens(weight: number): Token[] {
    const tokens: Token[] = [];
    const def = this.influence.def * weight;

    // Renforcement du volume défensif pour contrer l'attaque
    const tackleCount = Math.max(3, Math.round(def / 2)); // ~10 jetons pour def=20
    const interceptCount = Math.max(2, Math.round(def / 4));

    for (let i = 0; i < tackleCount; i++) tokens.push(this.createToken('TACKLE', 10));
    for (let i = 0; i < interceptCount; i++) tokens.push(this.createToken('INTERCEPT', 12));
    
    return tokens;
  }

  private createToken(type: TokenType, quality: number): Token {
    return {
      id: `${this.id}-${type}-${Math.random()}`,
      type,
      ownerId: this.id,
      teamId: this.teamId,
      quality: quality,
      duration: 4
    };
  }
}
