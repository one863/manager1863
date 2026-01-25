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
        debugLogs: this.logs,
        ballHistory: this.sampleMomentum(),
        stats: this.tracker.getFinalStats(),
        stoppageTime: Math.ceil(this.accumulatedStoppageTime / 60)
    };
  }

  public step() {
    this.players.forEach(p => p.updateInfluence(this.ballPosition.x, this.ballPosition.y, p.teamId === this.homeTeamId));
    this.recordMomentum();

    const zoneInfluences: Record<string, any> = {};
    for (let x = 0; x < 6; x++) {
        for (let y = 0; y < 5; y++) {
            const zKey = `${x},${y}`;
            let hAtk = 0; let hDef = 0;
            let aAtk = 0; let aDef = 0;
            
            this.players.forEach(p => {
                const power = p.activeZones.includes(zKey) ? 1.5 : (p.reachZones.includes(zKey) ? 0.7 : 0);
                if (power > 0) {
                    const isHome = p.teamId === this.homeTeamId;
                    // Territorial Weighting: Atk increases towards opponent goal, Def towards own goal
                    // Home attacks towards X=5, Away towards X=0
                    const atkWeight = isHome ? (x / 5) : ((5 - x) / 5);
                    const defWeight = isHome ? ((5 - x) / 5) : (x / 5);

                    const pAtk = p.influence.atk * power * (0.1 + atkWeight * 0.9);
                    const pDef = p.influence.def * power * (0.1 + defWeight * 0.9);

                    if (isHome) {
                        hAtk += pAtk;
                        hDef += pDef;
                    } else {
                        aAtk += pAtk;
                        aDef += pDef;
                    }
                }
            });
            zoneInfluences[zKey] = { 
                homeAtk: Math.round(hAtk), homeDef: Math.round(hDef), 
                awayAtk: Math.round(aAtk), awayDef: Math.round(aDef) 
            };
        }
    }

    const fullBag = this.grid.buildBag(this.ballPosition, this.currentSituation, this.possessionTeamId, this.homeTeamId, this.awayTeamId);
    const token = fullBag[0];

    const bagSummary = fullBag.map(t => ({ type: t.type, teamId: t.teamId, ownerId: t.ownerId }));
    const drawnTokenSummary = { type: token.type, teamId: token.teamId, ownerId: token.ownerId };

    this.resolveToken(token, bagSummary, drawnTokenSummary, zoneInfluences);
    
    if (this.currentSituation !== 'NORMAL' && this.currentSituation !== 'REBOUND_ZONE' && this.currentSituation !== 'KICK_OFF') {
        this.currentSituation = 'NORMAL';
    }
  }

  private resolveToken(token: Token, bagSum: any[], drawnSum: any, zoneInfluences: any) {
    const player = this.grid.getPlayer(token.ownerId);
    const pName = player ? player.name : (token.teamId === 0 ? "Système" : "Collectif");
    const logic = TOKEN_LOGIC[token.type];
    
    if (!logic) { this.currentTime += 5; return; }

    const result = logic(token, pName, token.teamId === this.homeTeamId, this.ballPosition);
    
    if (result.moveX !== 0 || result.moveY !== 0) {
        this.ballPosition.x = Math.max(0, Math.min(5, this.ballPosition.x + result.moveX));
        this.ballPosition.y = Math.max(0, Math.min(4, this.ballPosition.y + result.moveY));
    }

    if (result.isGoal) {
        this.accumulatedStoppageTime += 30;
        this.tracker.trackAction(token.teamId, result, 60);

        // 1. LOG DU BUT (Immédiat, ballon au filet)
        this.log('EVENT', result.logMessage, { 
            subtype: 'GOAL', pName, teamId: token.teamId, 
            bag: bagSum, drawn: drawnSum, statImpact: result.stats,
            zoneInfluences 
        });

        // 2. LOG DE CÉLÉBRATION (30s plus tard, ballon reste au filet)
        this.currentTime += 30; 
        this.log('ACTION', `Célébration du but !`, { 
            subtype: 'CELEBRATION', pName, teamId: token.teamId,
            zoneInfluences 
        });

        // 3. LOG DE MISE EN PLACE (Encore 30s, ballon revient au centre)
        this.currentTime += 30;
        this.resetKickOff(this.getOpponentId(token.teamId));
        return; 
    }

    this.tracker.trackAction(token.teamId, result, result.customDuration || 5);
    const duration = Math.max(1, result.customDuration || token.duration || 1);
    if (result.possessionChange) this.possessionTeamId = this.getOpponentId(this.possessionTeamId);
    
    if (this.currentSituation === 'KICK_OFF') {
        this.currentSituation = 'NORMAL';
    } else if (result.nextSituation) {
        this.currentSituation = result.nextSituation;
    }

    this.log(result.isEvent ? 'EVENT' : 'ACTION', result.logMessage, { 
        subtype: result.eventSubtype || 'ACTION', pName, teamId: token.teamId, 
        bag: bagSum, drawn: drawnSum, statImpact: result.stats,
        zoneInfluences 
    });

    this.currentTime += duration;
  }

  private getOpponentId(id: number) { return id === this.homeTeamId ? this.awayTeamId : this.homeTeamId; }
  
  private resetKickOff(id: number) { 
      this.ballPosition = { x: id === this.homeTeamId ? 2 : 3, y: 2 }; 
      this.possessionTeamId = id; 
      this.currentSituation = 'KICK_OFF'; 

      this.log('EVENT', "Préparation du coup d'envoi.", { 
          subtype: 'KICK_OFF', teamId: id 
      });
  }

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
          bag: opt.bag, drawnToken: opt.drawn, statImpact: opt.statImpact,
          zoneInfluences: opt.zoneInfluences
      });
  }
}
