import { Token, TokenType, GridPosition, PlayerStats } from "./types";

export class TokenPlayer {
  public id: number;
  public name: string;
  public teamId: number;
  public role: string;
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
    this.confidence = data.confidence ?? 50;
    
    // Stats complètes avec valeurs par défaut
    this.stats = {
      // Technique
      finishing: data.stats?.finishing ?? 10,
      passing: data.stats?.passing ?? 10,
      dribbling: data.stats?.dribbling ?? 10,
      crossing: data.stats?.crossing ?? 10,
      vision: data.stats?.vision ?? 10,
      longShots: data.stats?.longShots ?? 10,
      heading: data.stats?.heading ?? 10,
      
      // Défense
      tackling: data.stats?.tackling ?? 10,
      marking: data.stats?.marking ?? 10,
      positioning: data.stats?.positioning ?? 10,
      
      // Physique
      pace: data.stats?.pace ?? 10,
      strength: data.stats?.strength ?? 10,
      endurance: data.stats?.endurance ?? 10,
      jumping: data.stats?.jumping ?? 10,
      
      // Mental
      composure: data.stats?.composure ?? 10,
      concentration: data.stats?.concentration ?? 10,
      aggression: data.stats?.aggression ?? 10,
      workRate: data.stats?.workRate ?? 10,
      
      // Gardien
      reflexes: data.stats?.reflexes,
      handling: data.stats?.handling,
      kicking: data.stats?.kicking,
      oneOnOnes: data.stats?.oneOnOnes,
      
      // Legacy
      technical: data.stats?.technical ?? 10,
      defense: data.stats?.defense ?? 10,
      
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

    // Influence réduite par la fatigue
    const fatigueFactor = 1 - Math.min(1, this.fatigue / 120);
    this.influence.atk = (this.stats.technical || 10) * factor * fatigueFactor;
    this.influence.def = (this.stats.defense || 10) * factor * fatigueFactor;
  }

  // Appeler après chaque action impliquant le joueur
  public applyFatigue(actionType: TokenType) {
    let cost = 0.5;
    if (actionType.startsWith('DRIBBLE')) cost = 1.5;
    else if (actionType.startsWith('SHOOT')) cost = 2.0;
    else if (actionType === 'TACKLE' || actionType === 'INTERCEPT') cost = 1.2;
    else if (actionType === 'PRESSING_SUCCESS') cost = 1.5;

    const endurance = this.stats.endurance || 10;
    this.fatigue += cost * (12 / Math.max(5, endurance));
    if (this.fatigue > 100) this.fatigue = 100;
  }

  // Récupération de fatigue
  public recoverFatigue(amount: number = 5) {
    this.fatigue = Math.max(0, this.fatigue - amount);
  }

  // Modifier la confiance (après but, passe décisive, erreur, etc.)
  public adjustConfidence(delta: number) {
    this.confidence = Math.max(0, Math.min(100, this.confidence + delta));
  }

  /**
   * Calcule le malus de tirs ratés basé sur:
   * - Base: 20 - finishing (ex: finishing=18 → 2 ratés de base)
   * - Fatigue: +1 raté tous les 25% de fatigue
   * - Confiance: +1 raté si confiance < 30, -1 si confiance > 70
   * - Composure: réduit l'impact de la pression
   */
  private getMissedShotsCount(finishing: number): number {
    // Base: 20 - finishing (finishing=18 → 2, finishing=12 → 8)
    let missed = Math.max(1, 20 - finishing);
    
    // Fatigue: ajoute des ratés
    const fatigueBonus = Math.floor(this.fatigue / 25);
    missed += fatigueBonus;
    
    // Confiance: modifie les ratés
    if (this.confidence < 30) {
      missed += 2;  // Pas confiant = plus de ratés
    } else if (this.confidence > 70) {
      missed = Math.max(1, missed - 1);  // Très confiant = moins de ratés
    }
    
    // Composure réduit l'impact (sang-froid)
    const composure = this.stats.composure || 10;
    if (composure >= 15) {
      missed = Math.max(1, missed - 1);
    }
    
    return Math.max(1, missed);
  }

  public getOffensiveTokens(weight: number, pos: GridPosition, homeTeamId: number, awayTeamId: number): Token[] {
    const tokens: Token[] = [];
    
    // Stats du joueur (avec weight pour zone active/reach)
    const passing = Math.round((this.stats.passing || 10) * weight);
    const dribbling = Math.round((this.stats.dribbling || 10) * weight);
    const finishing = Math.round((this.stats.finishing || 10) * weight);
    const vision = Math.round((this.stats.vision || 10) * weight);
    const crossing = Math.round((this.stats.crossing || 10) * weight);
    
    // Déterminer si on est dans le dernier tiers
    const isHomeTeam = this.teamId === homeTeamId;
    const targetX = isHomeTeam ? 5 : 0;
    const isInFinalThird = Math.abs(targetX - pos.x) <= 1;
    const isInBox = Math.abs(targetX - pos.x) === 0 && pos.y >= 1 && pos.y <= 3; // Surface (zone de tir)
    const isOnWing = pos.y === 0 || pos.y === 4;

    // ============================================
    // SYSTÈME SIMPLE : stat = nombre de jetons = qualité
    // Un joueur avec passing=15 met 15 jetons PASS avec qualité 15
    // MAIS : dans la surface, on réduit fortement les passes !
    // ============================================

    // 1. PASSES - basées sur la stat passing
    // Dans la surface : très peu de passes (on est là pour tirer !)
    const passMultiplier = isInBox ? 0.2 : 1.0; // 80% de réduction dans la surface
    const passCount = Math.max(1, Math.round(passing * passMultiplier));
    for (let i = 0; i < passCount; i++) {
      tokens.push(this.createToken('PASS_SHORT', passing));
    }
    // Passes en retrait (encore moins dans la surface)
    const backPassCount = isInBox ? 1 : Math.ceil(passing / 3);
    for (let i = 0; i < backPassCount; i++) {
      tokens.push(this.createToken('PASS_BACK', passing));
    }
    // Renversements de jeu (vision + passing élevés) - PAS dans la surface
    if (!isInBox && vision >= 10 && passing >= 10) {
      for (let i = 0; i < Math.ceil(vision / 4); i++) {
        tokens.push(this.createToken('PASS_SWITCH', vision));
      }
    }
    // Combinaisons (une-deux) - PAS dans la surface
    if (!isInBox && passing >= 12) {
      for (let i = 0; i < Math.ceil(passing / 5); i++) {
        tokens.push(this.createToken('COMBO_PASS', passing));
      }
    }

    // 2. PASSES LONGUES et VISION - basées sur vision
    if (!isInFinalThird) {
      for (let i = 0; i < Math.ceil(vision / 2); i++) {
        tokens.push(this.createToken('PASS_LONG', vision));
      }
    }
    // Passes décisives (vision élevée) - PAS dans la surface (on y est déjà !)
    if (!isInBox && vision >= 10) {
      const throughBallCount = Math.ceil(vision / 2);
      for (let i = 0; i < throughBallCount; i++) {
        tokens.push(this.createToken('THROUGH_BALL', vision + 5));
      }
    }

    // 3. DRIBBLES - basés sur dribbling (réduit dans la surface)
    const dribbleMultiplier = isInBox ? 0.3 : 1.0;
    const dribbleCount = Math.max(1, Math.ceil(dribbling / 2 * dribbleMultiplier));
    for (let i = 0; i < dribbleCount; i++) {
      tokens.push(this.createToken('DRIBBLE', dribbling));
    }

    // 4. CENTRES - basés sur crossing (uniquement sur les ailes)
    if (isOnWing && isInFinalThird) {
      for (let i = 0; i < crossing; i++) {
        tokens.push(this.createToken('CROSS', crossing));
      }
      for (let i = 0; i < Math.ceil(crossing / 2); i++) {
        tokens.push(this.createToken('CUT_BACK', crossing));
      }
    }

    // 5. TIRS - basés sur finishing (uniquement en zone de tir)
    if (isInFinalThird) {
      // Nombre de jetons SHOOT_GOAL = finishing * 2 (boost offensif)
      // Un attaquant à 18 met 36 jetons BUT avec qualité 18+10 (bonus zone)
      const goalTokenCount = Math.ceil(finishing * 2);
      const goalQuality = finishing + 10; // Bonus qualité pour les buts
      for (let i = 0; i < goalTokenCount; i++) {
        tokens.push(this.createToken('SHOOT_GOAL', goalQuality));
      }
      
      // Tirs ratés = MOINS nombreux et qualité réduite
      // finishing=18 → 2 ratés de base (moins impactant)
      const missCount = Math.max(1, Math.floor(this.getMissedShotsCount(finishing) / 2));
      for (let i = 0; i < missCount; i++) {
        // Qualité très basse = rarement tirés
        tokens.push(this.createToken('SHOOT_SAVED', Math.max(3, missCount)));
        tokens.push(this.createToken('SHOOT_OFF_TARGET', Math.max(3, missCount)));
      }
      
      // Woodwork (malchance pure, indépendant des stats)
      tokens.push(this.createToken('SHOOT_WOODWORK', 2));
    }

    // 6. TIRS DE LOIN - basés sur longShots (hors surface)
    const longShots = Math.round((this.stats.longShots || 10) * weight);
    if (!isInFinalThird && longShots >= 12) {
      for (let i = 0; i < Math.ceil(longShots / 3); i++) {
        tokens.push(this.createToken('SHOOT_OFF_TARGET', longShots));
      }
    }

    // 7. JEU DE TÊTE offensif - basé sur heading + jumping
    const heading = Math.round((this.stats.heading || 10) * weight);
    const jumping = this.stats.jumping || 10;
    if (heading >= 12 && jumping >= 10) {
      for (let i = 0; i < Math.ceil(heading / 3); i++) {
        tokens.push(this.createToken('HEAD_SHOT', heading));
        tokens.push(this.createToken('HEAD_PASS', heading));
      }
    }

    return tokens;
  }

  public getDefensiveTokens(weight: number): Token[] {
    const tokens: Token[] = [];
    
    // Stats défensives avec weight
    const tackling = Math.round((this.stats.tackling || 10) * weight);
    const positioning = Math.round((this.stats.positioning || 10) * weight);
    const marking = Math.round((this.stats.marking || 10) * weight);
    const heading = Math.round((this.stats.heading || 10) * weight);
    const aggression = this.stats.aggression || 10;

    // ============================================
    // SYSTÈME SIMPLE : stat = nombre de jetons = qualité
    // Un défenseur avec tackling=16 met 16 jetons TACKLE avec qualité 16
    // ============================================

    // TACKLES - basés sur tackling (réduit pour équilibrer offense/défense)
    const tackleCount = Math.ceil(tackling / 2);
    for (let i = 0; i < tackleCount; i++) {
      tokens.push(this.createToken('TACKLE', tackling));
    }

    // INTERCEPTIONS - basés sur positioning (réduit pour équilibrer)
    const interceptCount = Math.ceil(positioning / 2);
    for (let i = 0; i < interceptCount; i++) {
      tokens.push(this.createToken('INTERCEPT', positioning));
    }

    // BLOCKS - basés sur marking
    for (let i = 0; i < Math.ceil(marking / 2); i++) {
      tokens.push(this.createToken('BLOCK', marking));
    }

    // CLEARANCE (dégagements) - basé sur heading
    if (heading >= 10) {
      for (let i = 0; i < Math.ceil(heading / 3); i++) {
        tokens.push(this.createToken('CLEARANCE', heading));
      }
    }

    // PRESSING - combinaison positioning + endurance
    const pressing = Math.ceil((positioning + (this.stats.endurance || 10)) / 4);
    for (let i = 0; i < pressing; i++) {
      tokens.push(this.createToken('PRESSING_SUCCESS', positioning));
    }

    // FAUTES - basées sur l'agressivité (plus agressif = plus de fautes)
    if (aggression >= 14) {
      const foulRisk = Math.ceil((aggression - 10) / 2);
      for (let i = 0; i < foulRisk; i++) {
        tokens.push(this.createToken('FOUL', aggression));
      }
    }

    // ERREURS - basées sur la fatigue et la concentration
    const concentration = this.stats.concentration || 10;
    const errorRisk = Math.ceil(this.fatigue / 30) + (concentration < 10 ? 1 : 0);
    for (let i = 0; i < errorRisk; i++) {
      tokens.push(this.createToken('ERROR', 5));
    }
    
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
