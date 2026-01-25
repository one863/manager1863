import { Token, TokenType, GridPosition, PlayerStats } from "./types";

export class TokenPlayer {
  public id: number;
  public name: string;
  public teamId: number;
  public role: string;
  public stats: PlayerStats;
  public influence: { atk: number; def: number } = { atk: 1, def: 1 };
  public fatigue: number = 0; // 0 = frais, 100 = épuisé
  public activeZones: string[] = [];
  public reachZones: string[] = [];

  constructor(data: any) {
    this.id = data.id;
    this.name = data.name;
    this.teamId = data.teamId;
    this.role = data.role || "MC";
    this.stats = {
      technical: data.stats?.technical ?? 10,
      defense: data.stats?.defense ?? 10,
      finishing: data.stats?.finishing ?? 10,
      endurance: data.stats?.endurance ?? 10,
      ...data.stats
    };
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

    // Influence réduite par la fatigue (exponentiel doux)
    const fatigueFactor = 1 - Math.min(1, this.fatigue / 120);
    this.influence.atk = (this.stats.technical || 10) * factor * fatigueFactor;
    this.influence.def = (this.stats.defense || 10) * factor * fatigueFactor;
  }

  // Appeler cette méthode après chaque action impliquant le joueur
  public applyFatigue(actionType: TokenType) {
    // Barème simple, à ajuster selon le réalisme souhaité
    let cost = 0.5; // coût de base
    if (actionType.startsWith('DRIBBLE')) cost = 1.5;
    else if (actionType.startsWith('SHOOT')) cost = 2.0;
    else if (actionType === 'TACKLE' || actionType === 'INTERCEPT') cost = 1.2;
    else if (actionType === 'SPRINT') cost = 2.5;
    // Plus d'autres cas si besoin

    // L'endurance réduit l'accumulation de fatigue
    const endurance = this.stats.endurance || 10;
    this.fatigue += cost * (12 / Math.max(5, endurance));
    // Clamp
    if (this.fatigue > 100) this.fatigue = 100;
  }

  // Récupération de fatigue (ex: à la mi-temps ou lors d'arrêts)
  public recoverFatigue(amount: number = 5) {
    this.fatigue = Math.max(0, this.fatigue - amount);
  }

  public getOffensiveTokens(weight: number, pos: GridPosition, homeTeamId: number, awayTeamId: number): Token[] {
    const tokens: Token[] = [];
    const tech = this.influence.atk * weight;
    const finishing = (this.stats.finishing || 10) * weight;
    // Correction : déterminer la direction cible selon l'ID d'équipe
    const isHomeTeam = this.teamId === homeTeamId;
    const targetX = isHomeTeam ? 5 : 0;
    const isInFinalThird = Math.abs(targetX - pos.x) <= 1;

    // 1. DILUTION MASSIVE (Standard Opta)
    // On multiplie les passes pour réduire le poids relatif des tirs/buts
    const shortCount = Math.min(10, Math.max(3, Math.round(tech * 1.0)));
    const backCount = Math.min(3, Math.max(1, Math.round(tech / 5)));
    for (let i = 0; i < shortCount; i++) tokens.push(this.createToken('PASS_SHORT', 10));
    for (let i = 0; i < backCount; i++) tokens.push(this.createToken('PASS_BACK', 8));

    if (!isInFinalThird) {
      const longCount = Math.min(3, Math.max(1, Math.round(tech / 6)));
      for (let i = 0; i < longCount; i++) tokens.push(this.createToken('PASS_LONG', 12));
    }

    // 2. DRIBBLES (Risque/Récompense)
    const dribbleCount = Math.min(3, Math.max(0, Math.round(tech / 10)));
    for (let i = 0; i < dribbleCount; i++) {
      tokens.push(this.createToken('DRIBBLE', 15));
    }

    // 3. TIRS (Loi de la Finition Équilibrée)
    if (isInFinalThird && finishing > 5) {
      tokens.push(this.createToken('SHOOT_GOAL', 20));
      for(let i=0; i<2; i++) tokens.push(this.createToken('SHOOT_SAVED', 15));
      for(let i=0; i<4; i++) tokens.push(this.createToken('SHOOT_OFF_TARGET', 10));
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
