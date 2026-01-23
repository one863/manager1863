import { GridPosition, Token } from "./types";
import { GridEngine } from "./grid-engine";
import { TokenPlayer } from "./token-player";

export class TokenMatchEngine {
  private currentTime: number = 0;
  private maxTime: number = 5700; 
  
  private ballPosition: GridPosition = { x: 2, y: 2 };
  private possessionTeamId: number;
  private homeTeamId: number; 
  private awayTeamId: number; 

  private grid: GridEngine;
  private matchEvents: any[] = [];
  
  // On garde momentumHistory car c'est utilisé pour le graphique "Opta"
  private momentumHistory: number[] = [];

  private stats = { shots: 0, goals: 0 };

  constructor(players: TokenPlayer[], homeTeamId: number, awayTeamId: number) {
    this.grid = new GridEngine(players);
    this.homeTeamId = homeTeamId;
    this.awayTeamId = awayTeamId;
    this.possessionTeamId = homeTeamId;
    this.ballPosition = { x: 2, y: 2 };
  }

  public simulateMatch() {
    console.log(`DÉBUT DU MATCH (Token Engine V9 - Cleaned)`);
    
    let loopGuard = 0;
    const MAX_LOOPS = 10000;

    while (this.currentTime < this.maxTime && loopGuard < MAX_LOOPS) {
      this.processPhase();
      loopGuard++;
    }
    
    return {
        events: this.matchEvents,
        ballHistory: this.momentumHistory
    };
  }

  private processPhase() {
    // 1. Déplacer les joueurs (Important pour que le momentum soit réaliste)
    this.grid.movePlayersTowardsBall(this.ballPosition, this.homeTeamId);

    // 2. Momentum Logic
    const momentumValue = (this.ballPosition.x * 4) - 10; 
    const possessionBonus = this.possessionTeamId === this.homeTeamId ? 2 : -2;
    this.momentumHistory.push(momentumValue + possessionBonus);

    // 3. Token Logic
    const bag = this.grid.buildBagForZone(this.ballPosition);

    if (bag.length === 0) {
      this.currentTime += 10; 
      this.ballPosition = { x: 2, y: 2 }; 
      return;
    }

    const drawnToken = bag[0]; 
    const duration = Math.max(2, drawnToken.duration); 
    this.currentTime += duration;
    
    this.resolveToken(drawnToken);
  }

  private resolveToken(token: Token) {
    if (token.type === 'FATIGUE') {
       const player = this.grid.getPlayer(token.ownerId);
       if (player) player.applyFatigue();
       return;
    }

    if (token.type === 'ERROR') {
        if (token.id === 'sys-lost') {
            this.switchPossession(token.teamId === this.homeTeamId ? this.awayTeamId : this.homeTeamId);
            return;
        }
        if (this.ballPosition.x === 0 || this.ballPosition.x === 5) {
            this.logEvent(token, "commet une erreur dangereuse !", "ERROR");
        }
        this.switchPossession(token.teamId === this.homeTeamId ? this.awayTeamId : this.homeTeamId);
        return;
    }

    const isAttacker = token.teamId === this.possessionTeamId;

    if (isAttacker) {
        if (token.type === 'PASS') {
            this.handlePass(token);
        } else if (token.type === 'SHOOT') {
            this.attemptGoal(token);
        } else if (token.type === 'DRIBBLE') {
             this.handleDribble(token);
        }
    } else {
        if (token.type === 'TACKLE' || token.type === 'INTERCEPT') {
            this.handleDefense(token);
        }
    }
  }

  private handleDefense(token: Token) {
      if (token.type === 'INTERCEPT') {
          this.switchPossession(token.teamId);
          this.logEvent(token, "intercepte la passe", "DEFENSE");
          return;
      }
      const foulChance = 0.15;
      if (Math.random() < foulChance) {
          this.handleFoul(token);
      } else {
          this.switchPossession(token.teamId);
          const isDecisive = (token.teamId === this.homeTeamId && this.ballPosition.x <= 1) || 
                             (token.teamId !== this.homeTeamId && this.ballPosition.x >= 4);
          if (isDecisive) this.logEvent(token, "réalise un tacle salvateur !", "DEFENSE");
      }
  }

  private handleFoul(token: Token) {
      this.currentTime += 30; 
      const rand = Math.random();
      if (rand < 0.10) { 
          this.logEvent(token, "est expulsé pour ce tacle dangereux !", "CARD"); 
      } else if (rand < 0.35) {
          this.logEvent(token, "reçoit un carton jaune.", "CARD");
      } else {
          this.logEvent(token, "commet la faute.", "FOUL");
      }
      this.switchPossession(token.teamId === this.homeTeamId ? this.awayTeamId : this.homeTeamId);
  }

  private handlePass(token: Token) {
      const direction = token.teamId === this.homeTeamId ? 1 : -1;
      const targetX = this.ballPosition.x + direction;
      const isHome = token.teamId === this.homeTeamId;
      
      let progressionChance = 0.8; 
      if (isHome && this.ballPosition.x >= 4) progressionChance = 0.45;
      if (!isHome && this.ballPosition.x <= 1) progressionChance = 0.45;

      if (Math.random() < progressionChance) {
          const newX = Math.max(0, Math.min(5, targetX));
          const newY = Math.max(0, Math.min(4, this.ballPosition.y + (Math.random() > 0.5 ? 1 : -1)));
          this.ballPosition = { x: newX, y: newY };
          
          const enteringBox = (isHome && newX === 5 && this.ballPosition.x !== 5) || (!isHome && newX === 0 && this.ballPosition.x !== 0);
          if (enteringBox) this.logEvent(token, "trouve une ouverture dans la surface", "PASS");
      } else {
          const moveBack = Math.random() > 0.7; 
          if (moveBack) {
              this.ballPosition.x = Math.max(0, Math.min(5, this.ballPosition.x - direction));
          } else {
             this.ballPosition.y = Math.max(0, Math.min(4, (Math.random() * 5) | 0));
          }
      }
  }

  private handleDribble(token: Token) {
      const direction = token.teamId === this.homeTeamId ? 1 : -1;
      const newX = Math.max(0, Math.min(5, this.ballPosition.x + direction));
      this.ballPosition.x = newX;
      if ((direction === 1 && newX >= 4) || (direction === -1 && newX <= 1)) {
          this.logEvent(token, "efface son vis-à-vis sur le côté", "DRIBBLE");
      }
  }

  private attemptGoal(token: Token) {
      this.stats.shots++;
      const isHome = token.teamId === this.homeTeamId;
      
      const isInShootingZone = (isHome && this.ballPosition.x >= 4) || (!isHome && this.ballPosition.x <= 1);             
      if (!isInShootingZone) {
          if (Math.random() > 0.98) this.scoreGoal(token, "TIR ET BUT ! (Frappe lointaine exceptionnelle)");
          else {
              this.logEvent(token, "tente sa chance de loin... sans danger", "SHOT");
              this.switchPossession(isHome ? this.awayTeamId : this.homeTeamId); 
          }
          return;
      }

      const baseChance = 0.12;
      const qualityBonus = (token.quality / 100) * 0.10;
      const totalChance = baseChance + qualityBonus;

      if (Math.random() < totalChance) {
          this.scoreGoal(token, "TIR ET BUT !");
      } else {
          if (Math.random() < 0.40) {
              if (Math.random() < 0.5) {
                  this.logEvent(token, "bute sur le gardien ! Corner à suivre.", "SHOT");
                  this.playCorner(token.teamId);
              } else {
                  this.logEvent(token, "voit sa frappe captée par le gardien.", "SHOT");
                  this.switchPossession(isHome ? this.awayTeamId : this.homeTeamId);
              }
          } else {
              this.logEvent(token, "ne trouve pas le cadre.", "SHOT");
              this.switchPossession(isHome ? this.awayTeamId : this.homeTeamId);
          }
      }
  }

  private playCorner(attackingTeamId: number) {
      this.currentTime += 45;
      this.logEvent({ ...this.createDummyToken(attackingTeamId), type: 'CORNER' } as any, "tire le corner...", "CORNER");

      if (Math.random() < 0.04) {
          const scorerToken = this.createDummyToken(attackingTeamId);
          this.scoreGoal(scorerToken as any, "TIR ET BUT ! (De la tête sur corner)");
      } else {
          const isHomeAttacking = attackingTeamId === this.homeTeamId;
          this.ballPosition.x = isHomeAttacking ? 3 : 2; 
          this.switchPossession(isHomeAttacking ? this.awayTeamId : this.homeTeamId);
      }
  }

  private scoreGoal(token: Token, message: string) {
      this.stats.goals++;
      this.logEvent(token, message, "GOAL");
      this.resetKickOff(token.teamId === this.homeTeamId ? this.awayTeamId : this.homeTeamId);
  }

  private switchPossession(newTeamId: number) {
      this.possessionTeamId = newTeamId;
  }

  private resetKickOff(teamToEngage: number) {
      this.ballPosition = { x: 2, y: 2 }; 
      this.switchPossession(teamToEngage);
      this.currentTime += 60; 
  }

  private logEvent(token: Token, actionName: string, type: string = "INFO") {
      this.matchEvents.push({
          time: this.currentTime,
          text: `Joueur ${token.ownerId} ${actionName}`,
          type: type === "INFO" ? token.type : type, 
          teamId: token.teamId
      });
  }

  private createDummyToken(teamId: number) {
      return { id: "sys", type: 'pass', ownerId: 0, teamId: teamId, quality: 50, duration: 0 };
  }
}
