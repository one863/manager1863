import { GridPosition, Token, TokenType, MatchLog, MatchSituation } from "./types";
import { GridEngine } from "./grid-engine";
import { TokenPlayer } from "./token-player";
import { ZoneManager } from "./zone-manager";
import { StatTracker } from "./stat-tracker";
import { MATCH_CONFIG } from "./config/match-config";
import { TOKEN_LOGIC } from "./config/token-logic";

export class TokenMatchEngine {
  public currentTime: number = 0; 
  public ballPosition: GridPosition = { x: 2, y: 2 };
  public possessionTeamId: number;
  public homeTeamId: number; 
  public awayTeamId: number;
  private homeName: string;
  private awayName: string;
  public currentSituation: MatchSituation = 'KICK_OFF'; 

  private grid: GridEngine;
  private tracker: StatTracker;
  private logs: MatchLog[] = [];
  private debugLogs: MatchLog[] = [];
  private rawMomentum: number[] = []; 
  private players: TokenPlayer[];
  private halfTimeReached: boolean = false;

  constructor(players: TokenPlayer[], homeId: number, awayId: number, homeName: string, awayName: string) {
    this.players = players;
    this.grid = new GridEngine(players);
    this.tracker = new StatTracker(homeId, awayId);
    this.homeTeamId = homeId; this.awayTeamId = awayId;
    this.homeName = homeName; this.awayName = awayName;
    this.possessionTeamId = homeId;
  }

  public simulateMatch() {
    this.currentTime = 0;
    this.ballPosition = { x: 2, y: 2 };
    this.currentSituation = 'KICK_OFF';
    this.logs = [];
    this.debugLogs = [];

    // Log de coup d'envoi avec le bag initial
    const kickOffBag = this.grid.buildBag(this.ballPosition, 'KICK_OFF', this.possessionTeamId, this.homeTeamId, this.awayTeamId);
    const kickOffLog: MatchLog = {
      time: 0,
      type: 'EVENT',
      text: `Le coup d'envoi va être donné par ${this.homeName}.`,
      eventSubtype: undefined,
      teamId: this.homeTeamId,
      possessionTeamId: this.possessionTeamId,
      ballPosition: { ...this.ballPosition },
      bag: kickOffBag.map(t => ({ type: t.type, teamId: t.teamId })),
      zoneInfluences: {}
    };
    this.logs.push(kickOffLog);
    this.debugLogs.push(kickOffLog);

    this.currentTime = 1;

    let safety = 0;
    let matchEnded = false;
    while (!matchEnded && this.currentTime < (MATCH_CONFIG.timing.matchDuration + 300) && safety++ < 25000) {
      if (!this.halfTimeReached && this.currentTime >= 2700) {
        this.log('EVENT', "C'est la mi-temps !", { subtype: 'STAT' });
        this.currentTime += 15;
        this.ballPosition = { x: 3, y: 2 }; // Away engage en 3,2
        this.currentSituation = 'KICK_OFF';
        this.possessionTeamId = this.awayTeamId;
        this.halfTimeReached = true;
      }
      this.step();
      // Condition explicite de fin de match (exemple : temps dépassé ou autre critère)
      if (this.currentTime >= (MATCH_CONFIG.timing.matchDuration + 300)) {
        matchEnded = true;
      }
    }
    this.log('EVENT', "Fin du match !", { subtype: 'INFO' });

    // Appliquer les bonus/malus de fin de match
    const finalStats = this.tracker.getFinalStats();
    const homeGoals = finalStats.shots[this.homeTeamId]?.goals || 0;
    const awayGoals = finalStats.shots[this.awayTeamId]?.goals || 0;
    this.tracker.applyEndOfMatchModifiers(homeGoals, awayGoals);

    // Génération des ratings basés sur les jetons joués
    const playerRatings = this.tracker.getPlayerRatings().map(pr => ({
      id: pr.id,
      name: pr.name,
      teamId: pr.teamId,
      role: pr.role,
      rating: pr.rating,
      fatigue: this.players.find(p => p.id === pr.id)?.fatigue || 0,
      goals: pr.goals,
      assists: pr.assists,
      actions: pr.actions,
      stats: pr.stats
    }));

    return {
      events: this.logs.filter(l => l.type === 'EVENT' || l.type === 'ACTION'),
      fullJournal: this.logs,
      debugLogs: this.debugLogs,
      ballHistory: this.sampleMomentum(),
      stats: finalStats,
      stoppageTime: 4,
      analysis: {
        ratings: playerRatings
      }
    };
  }

  public step() {
    this.players.forEach(p => p.updateInfluence(this.ballPosition.x, this.ballPosition.y, p.teamId === this.homeTeamId));
    this.recordMomentum();

    const zoneInfluences: Record<string, any> = {};
    for (let x = 0; x < 6; x++) {
      for (let y = 0; y < 5; y++) {
        const zKey = `${x},${y}`;
        let hAtk = 0; let hDef = 0; let aAtk = 0; let aDef = 0;
        this.players.forEach(p => {
          const power = p.activeZones.includes(zKey) ? 1.5 : (p.reachZones.includes(zKey) ? 0.7 : 0);
          if (power > 0) {
            const isHome = p.teamId === this.homeTeamId;
            const pAtk = p.influence.atk * power;
            const pDef = p.influence.def * power;
            if (isHome) { hAtk += pAtk; hDef += pDef; } else { aAtk += pAtk; aDef += pDef; }
          }
        });
        zoneInfluences[zKey] = { homeAtk: Math.round(hAtk), homeDef: Math.round(hDef), awayAtk: Math.round(aAtk), awayDef: Math.round(aDef) };
      }
    }

    const currentBag = this.grid.buildBag(this.ballPosition, this.currentSituation, this.possessionTeamId, this.homeTeamId, this.awayTeamId);
    // Tirage pondéré par la qualité : les bons joueurs ont plus de chances d'agir
    const token = this.grid.drawWeighted(currentBag);
    if (token) {
        this.resolveToken(token, currentBag, zoneInfluences);
    } else {
        this.currentTime += 5;
    }
  }

  private resolveToken(token: Token, currentBag: Token[], zoneInfluences: any) {

    let player = this.grid.getPlayer(token.ownerId);
    
    // Si c'est un jeton système (ownerId === 0), trouver un joueur de l'équipe dans la zone
    if (!player && token.ownerId === 0 && token.teamId !== 0) {
      const zoneKey = `${this.ballPosition.x},${this.ballPosition.y}`;
      // Chercher un joueur de l'équipe du jeton qui est dans la zone
      let candidatePlayers = this.players.filter(p => 
        p.teamId === token.teamId && 
        (p.activeZones.includes(zoneKey) || p.reachZones.includes(zoneKey))
      );
      
      // Si aucun joueur dans la zone, chercher par rôle approprié pour l'action
      if (candidatePlayers.length === 0) {
        const isShootingAction = token.type.startsWith('SHOOT') || token.type === 'HEAD_SHOT' || token.type === 'CORNER_GOAL' || token.type === 'PENALTY_GOAL';
        const isDefensiveAction = ['TACKLE', 'INTERCEPT', 'BLOCK', 'CLEARANCE', 'SHOOT_SAVED', 'SHOOT_OFF_TARGET'].includes(token.type);
        
        if (isShootingAction) {
          // Pour les tirs, chercher attaquants et milieux offensifs
          candidatePlayers = this.players.filter(p => 
            p.teamId === token.teamId && 
            ['ST', 'STL', 'STR', 'CF', 'AMC', 'AML', 'AMR', 'LW', 'RW', 'MC'].includes(p.role.toUpperCase())
          );
        } else if (isDefensiveAction) {
          // Pour les actions défensives, chercher défenseurs et gardien
          candidatePlayers = this.players.filter(p => 
            p.teamId === token.teamId && 
            ['GK', 'DC', 'DCL', 'DCR', 'DL', 'DR', 'DM'].includes(p.role.toUpperCase())
          );
        } else {
          // Fallback : n'importe quel joueur de l'équipe
          candidatePlayers = this.players.filter(p => p.teamId === token.teamId);
        }
      }
      
      if (candidatePlayers.length > 0) {
        // Prendre un joueur au hasard pondéré par son influence
        const totalInfluence = candidatePlayers.reduce((sum, p) => sum + (p.influence.atk + p.influence.def), 0);
        let roll = Math.random() * totalInfluence;
        for (const p of candidatePlayers) {
          roll -= (p.influence.atk + p.influence.def);
          if (roll <= 0) {
            player = p;
            break;
          }
        }
        if (!player) player = candidatePlayers[0];
      }
    }
    
    // Correction : fallback explicite pour éviter undefined dans les logs de but
    let pName: string;
    if (player && player.name) {
      pName = player.name;
    } else if (token.teamId === 0) {
      pName = "Système";
    } else {
      // Fallback : choisir un joueur offensif de l’équipe, sinon n’importe qui de l’équipe
      const teamPlayers = this.players.filter(p => p.teamId === token.teamId);
      // Privilégier les attaquants ou milieux offensifs
      const forwards = teamPlayers.filter(p => p.role && /attaquant|avant|striker|forward|milieu offensif|offensif/i.test(p.role));
      const fallbackPlayer = forwards[0] || teamPlayers[0];
      pName = fallbackPlayer?.name || "Joueur inconnu";
    }
    const pRole = player ? player.role : "";
    const logic = TOKEN_LOGIC[token.type];
    if (!logic) { this.currentTime += 5; return; }

    const result = logic(token, pName, token.teamId === this.homeTeamId, this.ballPosition);

    // Tracker la performance individuelle du joueur
    if (player) {
      this.tracker.trackPlayerAction(
        player.id,
        player.name,
        player.teamId,
        pRole,
        token.type,
        result,
        this.ballPosition
      );
    }

    // Séquence spéciale après un but : log du but, célébration puis remise en jeu
    if (result.isGoal) {
      // 0. Log du but d'abord avec le nom du joueur et les stats
      const duration = Math.max(2, result.customDuration || token.duration || 5);
      this.currentTime += duration;
      
      const nextBag = this.grid.buildBag(this.ballPosition, this.currentSituation, this.possessionTeamId, this.homeTeamId, this.awayTeamId);
      const logObj: MatchLog = {
        time: this.currentTime, 
        type: 'EVENT', 
        // Si pName est 'Collectif' ou 'Système', on adapte le texte pour éviter "undefined"
        text: (pName && pName !== 'Collectif' && pName !== 'Système')
          ? result.logMessage
          : `BUT !!! Frappe chirurgicale d'un collectif !`,
        eventSubtype: 'GOAL',
        playerName: pName,
        teamId: token.teamId,
        possessionTeamId: this.possessionTeamId,
        ballPosition: { ...this.ballPosition },
        bag: nextBag.map(t => ({ type: t.type, teamId: t.teamId })),
        drawnToken: { type: token.type, teamId: token.teamId },
        statImpact: result.stats
      };
      this.logs.push(logObj);
      this.debugLogs.push(logObj);
      // Tracker les stats du but AVANT le return
      this.tracker.trackAction(token.teamId, result, duration);

      // 1. Jeton célébration (30s) - garde la couleur de l'équipe qui a marqué
      this.currentTime += 30;
      this.log('EVENT', 'Célébration du but !', { subtype: 'GOAL', teamId: token.teamId, ballPosition: { ...this.ballPosition } });

      // Changement de possession APRÈS la célébration (l'équipe qui a encaissé reprend)
      const concedingTeamId = token.teamId === this.homeTeamId ? this.awayTeamId : this.homeTeamId;
      this.possessionTeamId = concedingTeamId;

      // 2. Jeton de remise en jeu (30s, balle au centre selon l'équipe qui engage)
      this.currentTime += 30;
      // Home engage en 2,2 (côté home), Away engage en 3,2 (côté away)
      this.ballPosition = { x: concedingTeamId === this.homeTeamId ? 2 : 3, y: 2 };
      this.currentSituation = 'KICK_OFF';
      this.log('EVENT', 'Remise en jeu après but.', { subtype: 'KICK_OFF', teamId: concedingTeamId, ballPosition: { ...this.ballPosition } });
      return;
    }

    // ========================================
    // GESTION CENTRALISÉE DU CHANGEMENT DE POSSESSION
    // ========================================
    
    // Appliquer la fatigue si le token est lié à un joueur
    if (player && token.type !== 'SYSTEM' && token.type !== 'NEUTRAL_POSSESSION') {
      player.applyFatigue(token.type);
    }

    if (this.currentSituation === 'KICK_OFF') {
      this.currentSituation = 'NORMAL';
    }

    // Cas 1: Turnover explicite via le flag turnover du result
    if (result.turnover) {
      // L'équipe qui avait le jeton perd la possession
      this.possessionTeamId = token.teamId === this.homeTeamId ? this.awayTeamId : this.homeTeamId;
    }
    // Cas 2: Tirs non convertis (spécial car le gardien récupère)
    else if (["SHOOT_OFF_TARGET", "SHOOT_SAVED", "SHOOT_SAVED_CORNER"].includes(token.type)) {
      // La possession passe à l'équipe adverse (le gardien récupère)
      this.possessionTeamId = token.teamId === this.homeTeamId ? this.awayTeamId : this.homeTeamId;
      // Repositionner la balle dans la zone du gardien
      if (token.type !== "SHOOT_SAVED_CORNER") {
        // Surface défensive de l'équipe qui récupère
        this.ballPosition = this.possessionTeamId === this.homeTeamId 
          ? { x: 0, y: 2 } 
          : { x: 5, y: 2 };
      }
    }
    // Cas 3: Poteau avec rebond (situation spéciale, possession non décidée)
    else if (token.type === "SHOOT_WOODWORK") {
      // La balle reste dans la zone, situation REBOUND_ZONE
      // La possession reste à l'attaquant jusqu'au prochain tirage
      this.currentSituation = 'REBOUND_ZONE';
    }
    // Cas 4: Jeton défensif (TACKLE, INTERCEPT, BLOCK, CLEARANCE, PUNCH, etc.)
    // Le jeton appartient déjà à l'équipe qui défend, donc token.teamId = l'équipe qui récupère
    else if (this.isDefensiveToken(token.type)) {
      // L'équipe du jeton défensif gagne la possession
      this.possessionTeamId = token.teamId;
    }
    // Cas 5: Action offensive normale - maintien de possession
    else {
      // La possession reste à l'équipe du jeton
      this.possessionTeamId = token.teamId;
    }

    // Mouvement de la balle
    if (result.moveX !== 0 || result.moveY !== 0) {
      this.ballPosition.x = Math.max(0, Math.min(5, this.ballPosition.x + result.moveX));
      this.ballPosition.y = Math.max(0, Math.min(4, this.ballPosition.y + result.moveY));
    }

    // Changement de situation si spécifié
    if (result.nextSituation) {
      this.currentSituation = result.nextSituation;
      // Gérer la possession selon la situation
      this.handleSituationPossession(token.teamId);
    }

    const duration = Math.max(2, result.customDuration || token.duration || 5);
    
    // Construire le prochain bag avec la possession mise à jour
    const nextBag = this.grid.buildBag(this.ballPosition, this.currentSituation, this.possessionTeamId, this.homeTeamId, this.awayTeamId);

    if (token.type !== 'SYSTEM' && token.type !== 'NEUTRAL_POSSESSION') {
      // Pour les buts, on force le playerName uniquement sur le log du but (pas sur célébration/remise en jeu)
      const isGoalEvent = result.eventSubtype === 'GOAL';
      const logObj: MatchLog = {
        time: this.currentTime, 
        type: result.isEvent ? 'EVENT' : 'ACTION', 
        text: result.logMessage, 
        eventSubtype: result.eventSubtype, 
        playerName: isGoalEvent ? pName : undefined, 
        teamId: token.teamId, 
        possessionTeamId: this.possessionTeamId, // Ajout possession réelle
        ballPosition: { ...this.ballPosition }, 
        bag: nextBag.map(t => ({ type: t.type, teamId: t.teamId })), 
        drawnToken: { type: token.type, teamId: token.teamId }, 
        statImpact: result.stats,
        zoneInfluences 
      };
      this.logs.push(logObj);
      this.debugLogs.push(logObj);
    }

    this.currentTime += duration;
    this.tracker.trackAction(token.teamId, result, duration);
  }

  private getOpponentId(id: number) { return id === this.homeTeamId ? this.awayTeamId : this.homeTeamId; }
  private recordMomentum() { this.rawMomentum.push((this.ballPosition.x - 2.5) * 4 + (this.possessionTeamId === this.homeTeamId ? 3 : -3)); }
  private sampleMomentum() {
    const step = Math.max(1, Math.floor(this.rawMomentum.length / 100));
    return Array.from({length: 100}, (_, i) => this.rawMomentum[Math.min(i * step, this.rawMomentum.length - 1)] || 0);
  }

  /**
   * Détermine si un type de jeton est défensif (récupération de balle)
   */
  private isDefensiveToken(type: TokenType): boolean {
    const defensiveTypes: TokenType[] = [
      'TACKLE', 'INTERCEPT', 'BLOCK', 'CLEARANCE', 'BALL_RECOVERY',
      'PUNCH', 'CLAIM', 'SAVE', 'PRESSING_SUCCESS', 'DUEL_WON',
      'CORNER_CLEARED', 'PENALTY_SAVED'
    ];
    return defensiveTypes.includes(type);
  }

  /**
   * Gère la possession selon la situation de jeu (corner, penalty, etc.)
   */
  private handleSituationPossession(tokenTeamId: number) {
    switch (this.currentSituation) {
      case 'CORNER':
        // Le corner est tiré par l'équipe qui avait le jeton (généralement l'attaquant)
        // Si c'est un tir dévié en corner, c'est l'attaquant qui obtient le corner
        this.possessionTeamId = tokenTeamId;
        break;
      case 'GOAL_KICK':
        // Le six mètres est pour l'équipe adverse (le gardien relance)
        this.possessionTeamId = this.getOpponentId(tokenTeamId);
        // Repositionner la balle
        this.ballPosition = this.possessionTeamId === this.homeTeamId 
          ? { x: 0, y: 2 } 
          : { x: 5, y: 2 };
        break;
      case 'THROW_IN':
        // La touche est pour l'équipe adverse
        this.possessionTeamId = this.getOpponentId(tokenTeamId);
        break;
      case 'FREE_KICK':
        // Le coup franc est pour l'équipe adverse (victime de la faute)
        this.possessionTeamId = this.getOpponentId(tokenTeamId);
        break;
      case 'PENALTY':
        // Le penalty est pour l'équipe adverse (victime de la faute)
        this.possessionTeamId = this.getOpponentId(tokenTeamId);
        // Repositionner la balle au point de penalty
        this.ballPosition = this.possessionTeamId === this.homeTeamId 
          ? { x: 5, y: 2 } 
          : { x: 0, y: 2 };
        break;
      // NORMAL, KICK_OFF, REBOUND_ZONE : pas de changement automatique
    }
  }

  private log(type: any, text: string, opt: any = {}) {
      const logObj = {
        time: this.currentTime, 
        type, text, 
        eventSubtype: opt.subtype,
        teamId: opt.teamId ?? this.possessionTeamId, // Ajouter teamId explicite
        possessionTeamId: this.possessionTeamId,
        ballPosition: opt.ballPosition ?? { ...this.ballPosition }, 
        zoneInfluences: opt.zoneInfluences || {},
        bag: this.grid.buildBag(this.ballPosition, this.currentSituation, this.possessionTeamId, this.homeTeamId, this.awayTeamId).map(t => ({ type: t.type, teamId: t.teamId })),
        drawnToken: undefined
      };
      this.logs.push(logObj);
      this.debugLogs.push(logObj);
  }
}
