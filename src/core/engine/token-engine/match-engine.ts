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
    
    // Log de démarrage (type START)
    const startLog: MatchLog = {
      time: 0,
      type: 'START',
      text: `Bienvenue pour ce match entre ${this.homeName} et ${this.awayName} !`,
      eventSubtype: undefined,
      teamId: this.homeTeamId,
      ballPosition: { ...this.ballPosition },
      bag: this.grid.buildBag(this.ballPosition, 'KICK_OFF', this.possessionTeamId, this.homeTeamId, this.awayTeamId).map(t => ({ type: t.type, teamId: t.teamId })),
      zoneInfluences: {}
    };
    this.logs.push(startLog);
    this.debugLogs.push(startLog);

    this.currentTime = 1;

    let safety = 0;
    let matchEnded = false;
    while (!matchEnded && this.currentTime < (MATCH_CONFIG.timing.matchDuration + 300) && safety++ < 25000) {
      if (!this.halfTimeReached && this.currentTime >= 2700) {
        this.log('EVENT', "C'est la mi-temps !", { subtype: 'STAT' });
        this.currentTime += 15;
        this.ballPosition = { x: 2, y: 2 };
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

    // Génération des ratings pour l'UI (onglet joueurs)
    const playerRatings = this.players.map(p => ({
      id: p.id,
      name: p.name,
      teamId: p.teamId,
      rating: 6.0 + Math.random() * 2, // TODO: remplacer par une vraie logique de rating
      fatigue: p.fatigue,
      goals: 0 // TODO: compter les buts par joueur si besoin
    }));

    return {
      events: this.logs.filter(l => l.type === 'EVENT' || l.type === 'ACTION'),
      fullJournal: this.logs,
      debugLogs: this.debugLogs,
      ballHistory: this.sampleMomentum(),
      stats: this.tracker.getFinalStats(),
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
    const token = currentBag[0];
    if (token) {
        this.resolveToken(token, currentBag, zoneInfluences);
    } else {
        this.currentTime += 5;
    }
  }

  private resolveToken(token: Token, currentBag: Token[], zoneInfluences: any) {

    const player = this.grid.getPlayer(token.ownerId);
    const pName = player ? player.name : (token.teamId === 0 ? "Système" : "Collectif");
    const logic = TOKEN_LOGIC[token.type];
    if (!logic) { this.currentTime += 5; return; }

    const result = logic(token, pName, token.teamId === this.homeTeamId, this.ballPosition);

    // Séquence spéciale après un but : célébration puis remise en jeu
    if (result.isGoal) {
      // 1. Jeton célébration (30s, pas de déplacement, pas de playerName)
      this.currentTime += 30;
      this.log('EVENT', 'Célébration du but !', { subtype: 'GOAL', ballPosition: { ...this.ballPosition } });

      // 2. Jeton de remise en jeu (30s, balle au centre, possession à l’équipe qui a encaissé, pas de playerName)
      this.currentTime += 30;
      const concedingTeamId = token.teamId === this.homeTeamId ? this.awayTeamId : this.homeTeamId;
      this.ballPosition = { x: 2, y: 2 };
      this.possessionTeamId = concedingTeamId;
      this.currentSituation = 'KICK_OFF';
      this.log('EVENT', 'Remise en jeu après but.', { subtype: 'KICK_OFF', ballPosition: { ...this.ballPosition } });
      return;
    }

    // Turnover après tir non cadré ou arrêté
    if (["SHOOT_OFF_TARGET", "SHOOT_SAVED", "SHOOT_WOODWORK"].includes(token.type)) {
      // La possession passe à l'autre équipe
      this.possessionTeamId = token.teamId === this.homeTeamId ? this.awayTeamId : this.homeTeamId;
      // On replace la balle dans la surface défensive de l'équipe qui récupère
      if (token.type === "SHOOT_OFF_TARGET" || token.type === "SHOOT_SAVED") {
        // Surface défensive de l'équipe qui récupère
        if (this.possessionTeamId === this.homeTeamId) {
          this.ballPosition = { x: 0, y: 2 };
        } else {
          this.ballPosition = { x: 5, y: 2 };
        }
        this.currentSituation = 'NORMAL';
      } else if (token.type === "SHOOT_WOODWORK") {
        // Rebond, la balle reste dans la zone
        this.currentSituation = 'REBOUND_ZONE';
      }
    }

    // Appliquer la fatigue si le token est lié à un joueur
    if (player && token.type !== 'SYSTEM' && token.type !== 'NEUTRAL_POSSESSION') {
      player.applyFatigue(token.type);
    }

    if (this.currentSituation === 'KICK_OFF') {
        this.currentSituation = 'NORMAL';
    }

    // La possession est toujours celle du teamId du jeton courant
    this.possessionTeamId = token.teamId;
    if (result.moveX !== 0 || result.moveY !== 0) {
      this.ballPosition.x = Math.max(0, Math.min(5, this.ballPosition.x + result.moveX));
      this.ballPosition.y = Math.max(0, Math.min(4, this.ballPosition.y + result.moveY));
    }

    const duration = Math.max(2, result.customDuration || token.duration || 5);
    let nextBag: Token[] = currentBag;
    let nextToken: Token | undefined;
    let nextZoneInfluences = zoneInfluences;
    let nextSituation = this.currentSituation;
    let nextBallPos = { ...this.ballPosition };

    // La possession change toujours avec le teamId du jeton courant, plus besoin de bloc possessionChange
    if (result.nextSituation) this.currentSituation = result.nextSituation;
    nextBag = this.grid.buildBag(this.ballPosition, this.currentSituation, this.possessionTeamId, this.homeTeamId, this.awayTeamId);

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
  private log(type: any, text: string, opt: any = {}) {
      const logObj = {
        time: this.currentTime, 
        type, text, 
        eventSubtype: opt.subtype, 
        ballPosition: { ...this.ballPosition }, 
        zoneInfluences: opt.zoneInfluences || {},
        bag: this.grid.buildBag(this.ballPosition, this.currentSituation, this.possessionTeamId, this.homeTeamId, this.awayTeamId).map(t => ({ type: t.type, teamId: t.teamId })),
        drawnToken: undefined
      };
      this.logs.push(logObj);
      this.debugLogs.push(logObj);
  }
}
