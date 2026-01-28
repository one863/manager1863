import { GridPosition, Token, MatchLog, MatchSituation } from "./types";
import { GridEngine } from "./grid-engine";
import { TOKEN_LOGIC } from "./config/token-logic";
import { TokenPlayer } from "./token-player";

export class TokenMatchEngine {
  private _pendingGoal: {
    team: 'home' | 'away';
    bag: Token[];
    token: Token;
    time: number;
  } | null = null;
  private _justKickedOff: boolean = false;
  private _nextTurnBag: Token[] | null = null;

  public currentTime: number = 0;
  public ballPosition: GridPosition = { x: 2, y: 2 };
  public possessionTeamId: number;
  public homeTeamId: number;
  public awayTeamId: number;
  public currentSituation: MatchSituation = 'KICK_OFF';

  private grid: GridEngine;
  private players: TokenPlayer[];
  private logs: MatchLog[] = [];
  private matchDuration: number = 5400; 
  public homeScore: number = 0;
  public awayScore: number = 0;

  constructor(homeId: number, awayId: number, players: TokenPlayer[]) {
    this.grid = new GridEngine();
    this.homeTeamId = homeId;
    this.awayTeamId = awayId;
    this.possessionTeamId = homeId;
    this.players = players;
  }

  // --- UTILITAIRES ---

  private ensureIds(bag: Token[]) {
    bag.forEach(t => {
      if (!t.id) t.id = Math.random().toString(36).substring(2, 11);
    });
    return bag;
  }

  private updatePlayersInfluence() {
    this.players.forEach(p =>
      p.updateInfluence(this.ballPosition.x, this.ballPosition.y)
    );
  }

  private serializeBag(bag: Token[]) {
    return bag.map(t => ({ ...t }));
  }

  // --- BOUCLE DE MATCH ---

  public simulateMatch() {
    this.currentTime = 0;
    this.ballPosition = { x: 2, y: 2 };
    this.currentSituation = 'KICK_OFF';
    this.logs = [];
    this.homeScore = 0;
    this.awayScore = 0;
    this._nextTurnBag = null;

    this.updatePlayersInfluence();

    const kickOffBag = this.grid.buildBag(
      this.ballPosition, 'KICK_OFF', this.possessionTeamId, this.homeTeamId, this.awayTeamId, this.players
    );
    this.ensureIds(kickOffBag);
    this._nextTurnBag = kickOffBag;

    this.log('EVENT', "Coup d'envoi imminent", kickOffBag);

    while (this.currentTime < this.matchDuration) {
      this.step();
    }

    this.log('EVENT', "Fin du match !");
    return {
      events: this.logs,
      ballPosition: this.ballPosition,
      possessionTeamId: this.possessionTeamId,
      homeScore: this.homeScore,
      awayScore: this.awayScore
    };
  }

  public step() {
    this.updatePlayersInfluence();

    let currentBag = this._nextTurnBag;
    if (!currentBag) {
      currentBag = this.grid.buildBag(
        this.ballPosition, this.currentSituation, this.possessionTeamId, this.homeTeamId, this.awayTeamId, this.players
      );
      this.ensureIds(currentBag);
    }

    const shuffled = this.grid.shuffle([...currentBag]);
    const token = shuffled[0];

    if (!token) {
      this.currentTime += 5;
      return;
    }

    this.resolveToken(token, currentBag);
  }

  private resolveToken(token: Token, sourceBag: Token[]) {
    const logic = TOKEN_LOGIC[token.type];
    if (!logic) { this.currentTime += 5; return; }

    const player = this.players.find(p => p.id === token.ownerId);
    const pName = player ? player.name : "Collectif";

    // Mise à jour de la fatigue du joueur pour cette action
    if (player) player.applyFatigue(token.type);

    const result = logic(token, pName, token.teamId === this.homeTeamId, this.ballPosition);

    // 1. MOUVEMENT & CLAMPING
    if (result.overrideBallPosition) {
      this.ballPosition = {
        x: Math.max(0, Math.min(5, result.overrideBallPosition.x)),
        y: Math.max(0, Math.min(4, result.overrideBallPosition.y))
      };
    } else {
      this.ballPosition.x = Math.max(0, Math.min(5, this.ballPosition.x + (result.moveX || 0)));
      this.ballPosition.y = Math.max(0, Math.min(4, this.ballPosition.y + (result.moveY || 0)));
    }

    // 2. DÉTECTION DU BUT
    if (result.nextSituation === 'GOAL_HOME' || result.nextSituation === 'GOAL_AWAY') {
      this._pendingGoal = {
        team: result.nextSituation === 'GOAL_HOME' ? 'home' : 'away',
        bag: sourceBag ? [...sourceBag] : [],
        token: token,
        time: this.currentTime,
      };
      this.handlePendingGoal();
      return;
    }

    // 3. POSSESSION
    if (result.turnover) {
      this.possessionTeamId = (token.teamId === this.homeTeamId) ? this.awayTeamId : this.homeTeamId;
    } else {
      this.possessionTeamId = token.teamId;
    }

    // 4. SITUATION
    if (this.currentSituation === 'KICK_OFF_RESTART' && this._justKickedOff) {
      this.currentSituation = 'NORMAL';
      this._justKickedOff = false;
    } else if (result.nextSituation) {
      this.currentSituation = result.nextSituation;
    } else if (this.currentSituation === 'KICK_OFF') {
      this.currentSituation = 'NORMAL';
    }

    // 5. PRÉPARATION DU TOUR SUIVANT
    this.updatePlayersInfluence();
    const nextBag = this.grid.buildBag(
      this.ballPosition, this.currentSituation, this.possessionTeamId, this.homeTeamId, this.awayTeamId, this.players
    );
    this.ensureIds(nextBag);
    this._nextTurnBag = nextBag;

    // 6. LOG & TEMPS
    this.log(
      result.isEvent ? 'EVENT' : 'ACTION',
      result.logMessage,
      nextBag,
      token,
      result.eventSubtype,
      pName
    );

    this.currentTime += result.customDuration || token.duration || 5;
  }

  private handlePendingGoal() {
    if (!this._pendingGoal) return;

    const scoringTeamId = this._pendingGoal.team === 'home' ? this.homeTeamId : this.awayTeamId;
    const candidates = (this._pendingGoal.bag || []).filter(t => t.teamId === scoringTeamId);

    let playerName = 'Joueur';
    let chosenToken = this._pendingGoal.token;

    if (candidates.length > 0) {
      const potentialScorers = candidates.filter(t =>
        ['ST', 'CF', 'AML', 'AMR', 'AMC', 'MC', 'MCL', 'MCR', 'ML', 'MR'].includes(t.position || '')
      );
      const shuffled = this.grid.shuffle(potentialScorers.length > 0 ? potentialScorers : candidates);
      chosenToken = shuffled[0];
    }

    const player = this.players.find(p => p.id === chosenToken.ownerId);
    playerName = player ? player.name : (chosenToken.position || "Collectif");
    
    // Boost de confiance pour le buteur
    if (player) player.adjustConfidence(10);

    if (this._pendingGoal.team === 'home') this.homeScore++;
    else this.awayScore++;

    const result = TOKEN_LOGIC[this._pendingGoal.token.type](
      this._pendingGoal.token,
      playerName,
      this._pendingGoal.team === 'home',
      this.ballPosition
    );
    
    this.log('EVENT', result.logMessage, this._pendingGoal.bag, this._pendingGoal.token, 'GOAL', playerName);

    this.currentTime += 30;
    this.log('EVENT', `Célébration de ${playerName} !`, [], undefined, undefined, playerName);

    this.currentTime += 30;
    this.ballPosition = (this._pendingGoal.team === 'home') ? { x: 3, y: 2 } : { x: 2, y: 2 };
    this.possessionTeamId = (this._pendingGoal.team === 'home') ? this.awayTeamId : this.homeTeamId;

    this.currentSituation = 'KICK_OFF_RESTART';
    this.updatePlayersInfluence();

    const restartBag = this.grid.buildBag(this.ballPosition, 'KICK_OFF', this.possessionTeamId, this.homeTeamId, this.awayTeamId, this.players);
    this.ensureIds(restartBag);
    this._nextTurnBag = restartBag;

    this.log('EVENT', 'Remise en jeu après but', restartBag);

    this._justKickedOff = true;
    this._pendingGoal = null;
  }

  private log(type: 'EVENT' | 'ACTION', text: string, bag?: Token[], drawnToken?: Token, eventSubtype?: string, playerName?: string) {
    this.logs.push({
      time: this.currentTime,
      type,
      text,
      teamId: drawnToken ? drawnToken.teamId : this.possessionTeamId,
      possessionTeamId: this.possessionTeamId,
      ballPosition: { ...this.ballPosition },
      bag: bag ? this.serializeBag(bag) : undefined,
      drawnToken: drawnToken ? { ...drawnToken } : undefined,
      eventSubtype,
      playerName
    } as MatchLog);
  }
}