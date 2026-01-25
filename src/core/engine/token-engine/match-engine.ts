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
    
    // Log de démarrage (type START)
    this.logs.push({
        time: 0,
        type: 'START',
        text: `Bienvenue pour ce match entre ${this.homeName} et ${this.awayName} !`,
        eventSubtype: 'INFO',
        ballPosition: { ...this.ballPosition },
        bag: this.grid.buildBag(this.ballPosition, 'KICK_OFF', this.possessionTeamId, this.homeTeamId, this.awayTeamId).map(t => ({ type: t.type, teamId: t.teamId, ownerId: t.ownerId })),
        zoneInfluences: {}
    });

    this.currentTime = 1;

    let safety = 0;
    while (this.currentTime < (MATCH_CONFIG.timing.matchDuration + 300) && safety++ < 25000) {
      if (!this.halfTimeReached && this.currentTime >= 2700) {
        this.log('EVENT', "C'est la mi-temps !", { subtype: 'STAT' });
        this.currentTime += 15;
        this.ballPosition = { x: 2, y: 2 };
        this.currentSituation = 'KICK_OFF';
        this.possessionTeamId = this.awayTeamId;
        this.halfTimeReached = true;
      }
      this.step();
    }
    this.log('EVENT', "Fin du match !", { subtype: 'INFO' });

    return {
        events: this.logs.filter(l => l.type === 'EVENT' || l.type === 'ACTION'),
        fullJournal: this.logs,
        debugLogs: this.logs,
        ballHistory: this.sampleMomentum(),
        stats: this.tracker.getFinalStats(),
        stoppageTime: 4
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
    
    if (this.currentSituation === 'KICK_OFF') {
        this.currentSituation = 'NORMAL';
    }

    if (result.moveX !== 0 || result.moveY !== 0) {
        this.ballPosition.x = Math.max(0, Math.min(5, this.ballPosition.x + result.moveX));
        this.ballPosition.y = Math.max(0, Math.min(4, this.ballPosition.y + result.moveY));
    }

    const duration = Math.max(2, result.customDuration || token.duration || 5);
    if (result.possessionChange) this.possessionTeamId = this.getOpponentId(this.possessionTeamId);
    if (result.nextSituation) this.currentSituation = result.nextSituation;

    const nextBag = this.grid.buildBag(this.ballPosition, this.currentSituation, this.possessionTeamId, this.homeTeamId, this.awayTeamId);

    if (token.type !== 'SYSTEM' && token.type !== 'NEUTRAL_POSSESSION') {
        this.logs.push({ 
            time: this.currentTime, 
            type: result.isEvent ? 'EVENT' : 'ACTION', 
            text: result.logMessage, 
            eventSubtype: result.eventSubtype || 'ACTION', 
            playerName: pName, 
            teamId: token.teamId, 
            ballPosition: { ...this.ballPosition }, 
            bag: nextBag.map(t => ({ type: t.type, teamId: t.teamId, ownerId: t.ownerId })), 
            drawnToken: { type: token.type, teamId: token.teamId, ownerId: token.ownerId }, 
            statImpact: result.stats,
            zoneInfluences 
        });
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
      this.logs.push({ 
          time: this.currentTime, 
          type, text, 
          eventSubtype: opt.subtype, 
          ballPosition: { ...this.ballPosition }, 
          zoneInfluences: opt.zoneInfluences || {},
          bag: this.grid.buildBag(this.ballPosition, this.currentSituation, this.possessionTeamId, this.homeTeamId, this.awayTeamId).map(t => ({ type: t.type, teamId: t.teamId, ownerId: t.ownerId })),
          drawnToken: undefined
      });
  }
}
