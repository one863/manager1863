import { GridPosition, Token, TokenType, MatchLog, MatchSituation } from "./types";
import { GridEngine } from "./grid-engine";
import { TokenPlayer } from "./token-player";
import { ZoneManager } from "./zone-manager";
import { StatTracker } from "./stat-tracker";
import { MATCH_CONFIG } from "./config/match-config";
import { TOKEN_LOGIC } from "./config/token-logic";

export class TokenMatchEngine {
  public currentTime: number = 0; 
  public baseDuration: number = MATCH_CONFIG.timing.matchDuration;
  public accumulatedStoppageTime: number = 0; 
  public ballPosition: GridPosition = { x: 2, y: 2 };
  public possessionTeamId: number;
  public homeTeamId: number; 
  public awayTeamId: number; 
  public currentSituation: MatchSituation = 'KICK_OFF'; 

  private grid: GridEngine;
  private zones: ZoneManager;
  private tracker: StatTracker;
  private logs: MatchLog[] = [];
  private rawMomentum: number[] = []; 
  private players: TokenPlayer[];
  private halfTimeReached: boolean = false;

  constructor(players: TokenPlayer[], homeId: number, awayId: number) {
    this.players = players;
    this.grid = new GridEngine(players);
    this.zones = new ZoneManager();
    this.tracker = new StatTracker(homeId, awayId);
    this.homeTeamId = homeId; this.awayTeamId = awayId;
    this.possessionTeamId = homeId;
  }

  public simulateMatch() {
    this.log('THINKING', "Coup d'envoi imminent...");
    this.currentTime = 1;
    let safety = 0;
    while (this.currentTime < (this.baseDuration + this.accumulatedStoppageTime) && safety++ < 25000) {
      if (!this.halfTimeReached && this.currentTime >= 2700) {
        this.log('EVENT', "MI-TEMPS", { subtype: 'STAT' });
        this.resetKickOff(this.awayTeamId);
        this.halfTimeReached = true;
      }
      this.step();
    }
    return {
        events: this.logs.filter(l => l.type === 'EVENT' || l.type === 'ACTION'),
        fullJournal: this.logs,
        ballHistory: this.sampleMomentum(),
        stats: this.tracker.getFinalStats(),
        stoppageTime: this.accumulatedStoppageTime
    };
  }

  public step() {
    this.players.forEach(p => p.updateInfluence(this.ballPosition.x, p.teamId === this.homeTeamId));
    this.recordMomentum();

    const fullBag = this.grid.buildBag(this.ballPosition, this.currentSituation, this.possessionTeamId, this.homeTeamId, this.awayTeamId);
    let filtered = fullBag.filter(t => {
        if (t.type.startsWith('SHOOT') && this.currentSituation === 'NORMAL') {
            if (this.ballPosition.y === 0 || this.ballPosition.y === 4 || this.ballPosition.x === 2 || this.ballPosition.x === 3) return false;
            if (this.possessionTeamId === this.homeTeamId ? this.ballPosition.x < 2 : this.ballPosition.x > 3) return false;
        }
        return (['TACKLE', 'INTERCEPT'].includes(t.type)) ? t.teamId !== this.possessionTeamId : (t.teamId === this.possessionTeamId || t.teamId === 0);
    });

    const token = filtered[Math.floor(Math.random() * filtered.length)] || fullBag[0];
    
    // --- PASSAGE DES INFOS DU SAC POUR L'UI --- 
    const bagSummary = filtered.map(t => ({ type: t.type, teamId: t.teamId }));
    const drawnTokenSummary = { type: token.type, teamId: token.teamId };

    this.resolveToken(token, bagSummary, drawnTokenSummary);
    if (this.currentSituation !== 'NORMAL' && this.currentSituation !== 'REBOUND_ZONE') this.currentSituation = 'NORMAL';
  }

  private resolveToken(token: Token, bagSum: any[], drawnSum: any) {
    const player = this.grid.getPlayer(token.ownerId);
    const pName = player ? player.name : (token.teamId === 0 ? "Système" : "Collectif");
    const logic = TOKEN_LOGIC[token.type];
    if (!logic) { this.currentTime += 5; return; }

    const result = logic(token, pName, token.teamId === this.homeTeamId, this.ballPosition);
    const duration = Math.max(1, result.customDuration || token.duration || 1);
    
    if (result.isGoal) this.accumulatedStoppageTime += 30;
    this.tracker.trackAction(token.teamId, result, duration);

    if (result.possessionChange) this.possessionTeamId = this.getOpponentId(this.possessionTeamId);
    if (result.moveX !== 0 || result.moveY !== 0) {
        this.ballPosition.x = Math.max(0, Math.min(5, this.ballPosition.x + result.moveX));
        this.ballPosition.y = Math.max(0, Math.min(4, this.ballPosition.y + result.moveY));
    }

    const type = result.isGoal ? 'GOAL' : (result.eventSubtype || 'ACTION');
    
    // --- APPEL DE LOG AVEC TOUTES LES DONNÉES --- 
    this.log(result.isGoal || result.isEvent ? 'EVENT' : 'ACTION', result.logMessage, { 
        subtype: type, pName, teamId: token.teamId, 
        bag: bagSum, drawn: drawnSum, statImpact: result.stats 
    });

    if (result.isGoal) this.resetKickOff(this.getOpponentId(token.teamId));
    else if (['SHOOT_SAVED', 'SHOOT_WOODWORK'].includes(token.type)) this.currentSituation = 'REBOUND_ZONE';
    else if (result.eventSubtype === 'CORNER' && !token.type.startsWith('CORNER')) this.currentSituation = 'CORNER';
    else if (token.type === 'SHOOT_OFF_TARGET') this.currentSituation = 'GOAL_KICK';
    else if (token.type === 'VAR_CHECK') this.currentSituation = 'VAR_ZONE';

    this.currentTime += duration;
  }

  private getOpponentId(id: number) { return id === this.homeTeamId ? this.awayTeamId : this.homeTeamId; }
  private resetKickOff(id: number) { this.ballPosition = { x: 2, y: 2 }; this.possessionTeamId = id; this.currentSituation = 'KICK_OFF'; this.currentTime += 30; }

  private recordMomentum() { this.rawMomentum.push((this.ballPosition.x - 2.5) * 4 + (this.possessionTeamId === this.homeTeamId ? 3 : -3)); }
  private sampleMomentum() {
    const step = Math.max(1, Math.floor(this.rawMomentum.length / 100));
    return Array.from({length: 100}, (_, i) => this.rawMomentum[Math.min(i * step, this.rawMomentum.length - 1)] || 0);
  }

  private log(type: any, text: string, opt: any = {}) {
      this.logs.push({ 
          time: this.currentTime, type, text, 
          eventSubtype: opt.subtype, playerName: opt.pName, teamId: opt.teamId, 
          ballPosition: { ...this.ballPosition }, 
          bag: opt.bag, drawnToken: opt.drawn, statImpact: opt.statImpact 
      });
  }
}
