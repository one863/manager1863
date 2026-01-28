import { Token, GridPosition, PlayerStats } from "./types";

export class TokenPlayer {
  public id: number;
  public name: string;
  public teamId: number;
  public role: string;
  public position?: string;
  public stats: PlayerStats;
  public influence: { atk: number; def: number } = { atk: 1, def: 1 };
  public fatigue: number = 0;      // 0 = frais, 100 = épuisé
  public confidence: number = 50;  // 0 = pas confiant, 100 = très confiant
  public activeZones: string[] = [];
  public reachZones: string[] = [];

  constructor(data: any) {
    this.id = data.id;
    this.name = data.name;
    this.teamId = data.teamId;
    this.role = data.role || "MC";
    this.position = data.position || data.role || "MC";
    this.confidence = data.confidence ?? 50;
    
    this.stats = {
      finishing: data.stats?.finishing ?? 10,
      passing: data.stats?.passing ?? 10,
      dribbling: data.stats?.dribbling ?? 10,
      crossing: data.stats?.crossing ?? 10,
      vision: data.stats?.vision ?? 10,
      longShots: data.stats?.longShots ?? 10,
      heading: data.stats?.heading ?? 10,
      tackling: data.stats?.tackling ?? 10,
      marking: data.stats?.marking ?? 10,
      positioning: data.stats?.positioning ?? 10,
      pace: data.stats?.pace ?? 10,
      strength: data.stats?.strength ?? 10,
      endurance: data.stats?.endurance ?? 10,
      jumping: data.stats?.jumping ?? 10,
      composure: data.stats?.composure ?? 10,
      concentration: data.stats?.concentration ?? 10,
      aggression: data.stats?.aggression ?? 10,
      workRate: data.stats?.workRate ?? 10,
      ...data.stats
    };
  }

  public updateInfluence(ballX: number, ballY: number) {
    let centerX = 2, centerY = 2;
    if (this.activeZones.length > 0) {
        const parts = this.activeZones[0].split(',');
        centerX = parseInt(parts[0]);
        centerY = parseInt(parts[1]);
    }

    const dist = Math.sqrt(Math.pow(ballX - centerX, 2) + Math.pow(ballY - centerY, 2));
    const factor = Math.max(0.2, 1.2 - dist * 0.2);

    const fatigueFactor = 1 - Math.min(0.5, this.fatigue / 150);
    this.influence.atk = (this.stats.finishing + this.stats.passing) / 2 * factor * fatigueFactor;
    this.influence.def = (this.stats.tackling + this.stats.positioning) / 2 * factor * fatigueFactor;
  }

  public applyFatigue(actionType: string) {
    let cost = 0.5;
    if (actionType.includes('DRIBBLE')) cost = 1.2;
    else if (actionType.includes('SHOOT')) cost = 1.5;
    else if (actionType === 'TACKLE') cost = 1.0;

    const endurance = this.stats.endurance || 10;
    this.fatigue += cost * (15 / Math.max(5, endurance));
    this.fatigue = Math.min(100, this.fatigue);
  }

  public getOffensiveTokens(weight: number, pos: GridPosition, homeTeamId: number): Token[] {
    const tokens: Token[] = [];
    const isHomeTeam = this.teamId === homeTeamId;
    const targetX = isHomeTeam ? 5 : 0;
    
    // Stats pondérées par l'influence de la zone
    const s = {
        pass: Math.round((this.stats.passing || 10) * weight),
        drib: Math.round((this.stats.dribbling || 10) * weight),
        fin: Math.round((this.stats.finishing || 10) * weight),
        vis: Math.round((this.stats.vision || 10) * weight),
        cross: Math.round((this.stats.crossing || 10) * weight)
    };

    const isInBox = Math.abs(targetX - pos.x) === 0 && pos.y >= 1 && pos.y <= 3;
    const isOnWing = pos.y === 0 || pos.y === 4;

    // 1. PASSES (Réduites en surface pour favoriser le tir)
    const passCount = isInBox ? 2 : s.pass;
    for (let i = 0; i < passCount; i++) tokens.push(this.createToken('PASS_SHORT'));
    
    // 2. VISION & PROFONDEUR
    const throughCount = Math.floor(s.vis / 2);
    for (let i = 0; i < throughCount; i++) tokens.push(this.createToken('PASS_THROUGH'));

    // 3. DRIBBLES
    const dribbleCount = Math.floor(s.drib / 2);
    for (let i = 0; i < dribbleCount; i++) tokens.push(this.createToken('DRIBBLE'));

    // 4. CENTRES
    if (isOnWing && Math.abs(targetX - pos.x) <= 2) {
      for (let i = 0; i < s.cross; i++) tokens.push(this.createToken('CROSS'));
    }

    // 5. FINITION (Le coeur du score)
    if (isInBox) {
        // En surface, la stat finishing définit le nombre de chances de marquer
        const shootCount = Math.ceil(s.fin / 2);
        for (let i = 0; i < shootCount; i++) tokens.push(this.createToken('SHOOT_GOAL'));
    }

    return tokens;
  }

  public getDefensiveTokens(weight: number): Token[] {
    const tokens: Token[] = [];
    const s = {
        tack: Math.round((this.stats.tackling || 10) * weight),
        pos: Math.round((this.stats.positioning || 10) * weight),
        mark: Math.round((this.stats.marking || 10) * weight)
    };

    for (let i = 0; i < s.tack; i++) tokens.push(this.createToken('TACKLE'));
    for (let i = 0; i < s.pos; i++) tokens.push(this.createToken('INTERCEPT'));
    for (let i = 0; i < s.mark; i++) tokens.push(this.createToken('BLOCK_SHOT'));

    return tokens;
  }

  private createToken(type: string): Token {
    let finalType = type;

    // --- LOGIQUE DE MUTATION DYNAMIQUE ---
    // On transforme le type de jeton selon l'état réel du joueur
    
    const isExhausted = this.fatigue > 75;
    const isConfident = this.confidence > 80;

    if (isExhausted) {
        // La fatigue "pollue" les actions
        if (type === 'PASS_SHORT') finalType = 'PASS_SHORT_TIRED';
        if (type === 'SHOOT_GOAL') finalType = 'SHOOT_GOAL_TIRED';
        if (type === 'TACKLE') finalType = 'TACKLE_TIRED';
    } else if (isConfident) {
        // La confiance booste certaines actions
        if (type === 'PASS_SHORT' && this.stats.passing > 15) finalType = 'PASS_SHORT_ELITE';
    }

    return {
      id: `p${this.id}-${finalType}-${Math.random().toString(36).substr(2, 5)}`,
      type: finalType,
      ownerId: this.id,
      teamId: this.teamId,
      duration: 5,
      position: this.role,
      metadata: { 
        fatigue: Math.round(this.fatigue),
        confidence: this.confidence
      }
    };
  }
}