import { GridPosition, Token, TokenType, MatchLog } from "./types";
import { GridEngine } from "./grid-engine";
import { TokenPlayer } from "./token-player";
import { ZoneManager } from "./zone-manager";
import { StatTracker } from "./stat-tracker";
import { MATCH_CONFIG } from "./config/match-config";
import { TOKEN_LOGIC } from "./config/token-logic";

export class TokenMatchEngine {
  public currentTime: number = 0;
  public maxTime: number = MATCH_CONFIG.timing.matchDuration + MATCH_CONFIG.timing.stoppageTime; 
  public ballPosition: GridPosition = { x: 2, y: 2 };
  public possessionTeamId: number;
  public homeTeamId: number; 
  public awayTeamId: number; 

  private grid: GridEngine;
  private zones: ZoneManager;
  private tracker: StatTracker;
  private logs: MatchLog[] = [];
  private rawMomentum: number[] = []; 
  private players: TokenPlayer[];

  constructor(players: TokenPlayer[], homeTeamId: number, awayTeamId: number, homeFormation: string, awayFormation: string) {
    this.players = players;
    this.grid = new GridEngine(players, homeTeamId, homeFormation, awayFormation);
    this.zones = new ZoneManager();
    this.tracker = new StatTracker(homeTeamId, awayTeamId);
    this.homeTeamId = homeTeamId;
    this.awayTeamId = awayTeamId;
    this.possessionTeamId = homeTeamId;
  }

  public simulateMatch() {
    this.logThinking("=== DÉBUT DU MATCH ===");
    let safetyCounter = 0;
    const MAX_STEPS = 20000; 

    while (this.currentTime < this.maxTime && safetyCounter < MAX_STEPS) {
      this.step();
      safetyCounter++;
    }

    if (safetyCounter >= MAX_STEPS) {
        console.error("Match engine hit safety limit! Infinite loop suspected.");
        this.logThinking("MATCH INTERROMPU (ERREUR TECHNIQUE)");
    }
    
    const sampledMomentum: number[] = [];
    const step = Math.max(1, Math.floor(this.rawMomentum.length / 100));
    for(let i = 0; i < 100; i++) {
        sampledMomentum.push(this.rawMomentum[Math.min(i * step, this.rawMomentum.length - 1)] || 0);
    }
    
    return {
        events: this.logs.filter(l => l.type === 'EVENT' || l.type === 'ACTION'),
        fullJournal: this.logs,
        ballHistory: sampledMomentum,
        stats: this.tracker.getFinalStats()
    };
  }

  public step() {
    if (this.currentTime >= this.maxTime) return null;

    const territory = (this.ballPosition.x - 2.5) * 4;
    const possessionBonus = this.possessionTeamId === this.homeTeamId ? 3 : -3;
    const m = territory + possessionBonus;
    this.rawMomentum.push(m);

    const fullBag = this.grid.buildBagForZone(this.ballPosition, this.possessionTeamId);
    
    let filteredBag = fullBag.filter(t => {
        const isDefensive = ['TACKLE', 'INTERCEPT', 'SAVE'].includes(t.type);
        if (isDefensive) return t.teamId !== this.possessionTeamId;
        return t.teamId === this.possessionTeamId || t.teamId === 0;
    });

    if (filteredBag.length === 0) filteredBag = fullBag;
    
    // Si toujours vide, on crée un jeton de secours pour éviter le crash
    if (filteredBag.length === 0) {
        this.currentTime += 5;
        return null;
    }

    const drawnToken = filteredBag[Math.floor(Math.random() * filteredBag.length)];
    const bagSummary = filteredBag.map(t => ({ type: t.type, teamId: t.teamId }));
    const drawnSummary = { type: drawnToken.type, teamId: drawnToken.teamId };
    
    const resolution = this.resolveToken(drawnToken, bagSummary, drawnSummary);

    return {
        time: this.currentTime,
        ballPosition: { ...this.ballPosition },
        possessionTeamId: this.possessionTeamId,
        drawnToken,
        filteredBag,
        fullBag,
        resolution
    };
  }

  private resolveToken(token: Token, bagSummary: any[], drawnSummary: any) {
    const startTime = this.currentTime;
    const player = this.grid.getPlayer(token.ownerId);
    const pName = player ? player.name : (token.teamId === 0 ? "Système" : "Collectif");
    const isHome = token.teamId === this.homeTeamId;

    const logic = TOKEN_LOGIC[token.type];
    if (!logic) {
        this.currentTime += 5; // Avance de sécurité
        return { message: "Action inconnue" };
    }

    const result = logic(token, pName, isHome);
    // Garantie de progression temporelle (min 1 seconde)
    const duration = Math.max(1, result.customDuration || token.duration || 1);
    
    for(let i = 1; i < duration; i++) {
        if (this.currentTime + i < this.maxTime) this.rawMomentum.push(this.rawMomentum[this.rawMomentum.length - 1]);
    }
    
    let possessionChanged = result.possessionChange;

    if (token.teamId !== 0) {
        this.tracker.trackAction(token, !possessionChanged, duration);
    }

    if (possessionChanged) {
        this.switchPossession(this.getOpponentId(this.possessionTeamId));
    }

    if (result.moveX !== 0 || result.moveY !== 0) {
        this.moveBall(result.moveX, result.moveY);
    }

    if (result.isGoal) {
        this.tracker.registerGoal(token.teamId);
        this.logEvent(startTime, token, pName, result.logMessage, 'GOAL', bagSummary, drawnSummary);
        this.resetKickOff(this.getOpponentId(token.teamId));
    } else if (result.isEvent) {
        this.logEvent(startTime, token, pName, result.logMessage, result.eventSubtype, bagSummary, drawnSummary);
    } else {
        this.logAction(startTime, token, pName, result.logMessage, bagSummary, drawnSummary);
    }

    this.currentTime += duration;

    if (player) {
        const effort = ['SHOOT', 'DRIBBLE', 'TACKLE'].includes(token.type) ? 2 : 1;
        player.applyFatigue(effort);
    }

    return result;
  }

  public getStats() {
      return this.tracker.getFinalStats();
  }

  private moveBall(dx: number, dy: number) {
      this.ballPosition.x = Math.max(0, Math.min(5, this.ballPosition.x + dx));
      this.ballPosition.y = Math.max(0, Math.min(4, this.ballPosition.y + dy));
  }

  private switchPossession(teamId: number) { 
      if (teamId && teamId !== 0) this.possessionTeamId = teamId; 
  }
  
  private getOpponentId(teamId: number) { 
      return teamId === this.homeTeamId ? this.awayTeamId : this.homeTeamId; 
  }
  
  private resetKickOff(teamToEngage: number) { 
      this.ballPosition = { x: 2, y: 2 }; 
      this.possessionTeamId = teamToEngage; 
      this.currentTime += MATCH_CONFIG.timing.kickOffDelay; 
  }

  private formatTime(seconds: number): string {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  private logThinking(text: string, summary?: string) {
      this.logs.push({ 
          time: this.currentTime, 
          type: 'THINKING', 
          text: `[SYSTEM] ${text}`, 
          bagSummary: summary,
          ballPosition: { ...this.ballPosition } 
      });
  }

  private logAction(time: number, token: Token, pName: string, text: string, bag?: any[], drawn?: any) {
      this.logs.push({ 
          time: time, 
          type: 'ACTION', 
          playerName: pName,
          text: `[${this.formatTime(time)}] ${pName} : ${text}`, 
          teamId: token.teamId,
          ballPosition: { ...this.ballPosition },
          bag,
          drawnToken: drawn
      });
  }

  private logEvent(time: number, token: Token, pName: string, text: string, subtype: any, bag?: any[], drawn?: any) {
      this.logs.push({ 
          time: time, 
          type: 'EVENT', 
          eventSubtype: subtype,
          playerName: pName,
          text: `[${this.formatTime(time)}] !!! ${text.toUpperCase()} !!!`, 
          teamId: token.teamId,
          ballPosition: { ...this.ballPosition },
          bag,
          drawnToken: drawn
      });
  }
}
