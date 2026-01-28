 import { GridPosition, Token, MatchLog, MatchSituation } from "./types";
import { GridEngine } from "./grid-engine";
import { TOKEN_LOGIC } from "./config/token-logic";

/**
 * Moteur ultra-simplifié :
 * - Pas d'influence joueurs/tactiques
 * - Chaque zone = sac de jetons prédéfinis (zone config)
 * - Tirage purement aléatoire
 */
export class TokenMatchEngine {
    // Gestion du but en attente et du flag de remise en jeu
    private _pendingGoal: {
      team: 'home' | 'away';
      bag: Token[];
      token: Token;
      time: number;
    } | null = null;
    private _justKickedOff: boolean = false;
  public currentTime: number = 0;
  public ballPosition: GridPosition = { x: 2, y: 2 };
  public possessionTeamId: number;
  public homeTeamId: number;
  public awayTeamId: number;
  public currentSituation: MatchSituation = 'KICK_OFF';
  private grid: GridEngine;
  private logs: MatchLog[] = [];
  private matchDuration: number = 5400; // 90 min * 60s
  public homeScore: number = 0;
  public awayScore: number = 0;

  constructor(homeId: number, awayId: number) {
    this.grid = new GridEngine();
    this.homeTeamId = homeId;
    this.awayTeamId = awayId;
    this.possessionTeamId = homeId;
    this.homeScore = 0;
    this.awayScore = 0;
  }

  public simulateMatch() {
    this.currentTime = 0;
    this.ballPosition = { x: 2, y: 2 };
    this.currentSituation = 'KICK_OFF';
    this.logs = [];
    this.homeScore = 0;
    this.awayScore = 0;
    // Log 0 : état de départ (coup d'envoi à -1s, possession home)
    this.logs.push({
      time: -1,
      type: 'EVENT',
      text: 'Coup d\'envoi immédiat',
      teamId: this.homeTeamId,
      possessionTeamId: this.homeTeamId,
      ballPosition: { ...this.ballPosition },
      bag: [],
      drawnToken: undefined
    } as MatchLog);
    let matchEnded = false;
    while (!matchEnded && this.currentTime < this.matchDuration) {
      this.step();
      if (this.currentTime >= this.matchDuration) matchEnded = true;
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
    const bag = this.grid.buildBag(this.ballPosition, this.currentSituation, this.possessionTeamId, this.homeTeamId, this.awayTeamId);
    const token = this.grid.drawWeighted(bag);
    if (!token) {
      this.currentTime += 5;
      this.log('ACTION', 'Aucun jeton tiré (sac vide)', bag, undefined);
      return;
    }
    this.resolveToken(token, bag);
  }

  private resolveToken(token: Token, bag: Token[]) {
    // Applique la logique du token (aléatoire, pas de stats)
    const logic = TOKEN_LOGIC[token.type];
    if (!logic) {
      this.currentTime += 5;
      return;
    }
    const result = logic(token, "Collectif", token.teamId === this.homeTeamId, this.ballPosition);
    // Mouvement balle
    if (result.moveX || result.moveY) {
      this.ballPosition.x = Math.max(0, Math.min(5, this.ballPosition.x + (result.moveX || 0)));
      this.ballPosition.y = Math.max(0, Math.min(4, this.ballPosition.y + (result.moveY || 0)));
    }
    // Score : détection d'un but (situation spéciale)
    let isGoal = false;
    if (result.nextSituation === 'GOAL_HOME' || result.nextSituation === 'GOAL_AWAY') {
      // On ne fait rien ici : le but sera loggé à l'étape suivante (voir ci-dessous)
      this._pendingGoal = {
        team: result.nextSituation === 'GOAL_HOME' ? 'home' : 'away',
        bag: bag ? [...bag] : [],
        token: token,
        time: this.currentTime,
      };
      // On avance le temps comme pour une action normale
      this.currentTime += result.customDuration || token.duration || 5;
      return;
    }
    // Si un but était en attente, on le log maintenant (avant l'action courante)
    if (this._pendingGoal) {
      const scorerRoles = [
        { code: 'MC', label: 'Milieu' }, { code: 'MCL', label: 'Milieu' }, { code: 'MCR', label: 'Milieu' },
        { code: 'ML', label: 'Milieu' }, { code: 'MR', label: 'Milieu' },
        { code: 'AMC', label: 'Milieu offensif' }, { code: 'AML', label: 'Ailier' }, { code: 'AMR', label: 'Ailier' },
        { code: 'ST', label: 'Attaquant' }, { code: 'STL', label: 'Attaquant' }, { code: 'STR', label: 'Attaquant' }, { code: 'CF', label: 'Attaquant' }
      ];
      const scoringTeamId = this._pendingGoal.team === 'home' ? this.homeTeamId : this.awayTeamId;
      const candidates = (this._pendingGoal.bag || []).filter(t => t.teamId === scoringTeamId && scorerRoles.some(r => (t.type || '').includes(r.code)));
      let playerName = 'Joueur';
      if (candidates.length > 0) {
        const chosen = candidates[Math.floor(Math.random() * candidates.length)];
        const found = scorerRoles.find(r => (chosen.type || '').includes(r.code));
        playerName = found ? found.label : 'Joueur';
      }
      if (this._pendingGoal.team === 'home') {
        this.homeScore++;
        // console.log supprimé
        this.log('EVENT', `But pour l'équipe à domicile !`, this._pendingGoal.bag, this._pendingGoal.token, 'GOAL', playerName);
      } else {
        this.awayScore++;
        // console.log supprimé
        this.log('EVENT', `But pour l'équipe à l'extérieur !`, this._pendingGoal.bag, this._pendingGoal.token, 'GOAL', playerName);
      }
      // 2. Log de célébration (30s, balle immobile, pas de changement de possession)
      this.currentTime += 30;
      // console.log supprimé
      this.log('EVENT', 'Célébration du but !', this._pendingGoal.bag, this._pendingGoal.token, undefined, undefined);
      // 3. Log de changement de possession/coup d'envoi (30s, balle au centre, possession à l'équipe qui a encaissé)
      this.currentTime += 30;
      // Placement du ballon selon l'équipe qui a encaissé
      if (this._pendingGoal.team === 'home') {
        // But home : coup d'envoi away en 3,2
        this.ballPosition = { x: 3, y: 2 };
        this.possessionTeamId = this.awayTeamId;
      } else {
        // But away : coup d'envoi home en 2,2
        this.ballPosition = { x: 2, y: 2 };
        this.possessionTeamId = this.homeTeamId;
      }
      this.currentSituation = 'KICK_OFF_RESTART';
      // console.log supprimé
      this.log('EVENT', 'Remise en jeu après but', this._pendingGoal.bag, this._pendingGoal.token, undefined, undefined);
      this._justKickedOff = true; // flag pour la prochaine action
      this._pendingGoal = null;
    }
    // Possession - turnover classique
    if (result.turnover) {
      this.possessionTeamId = token.teamId === this.homeTeamId ? this.awayTeamId : this.homeTeamId;
    } else {
      this.possessionTeamId = token.teamId;
    }
    // Situation classique
    if (this.currentSituation === 'KICK_OFF_RESTART' && this._justKickedOff) {
      // Après la première action de remise en jeu, repasser à NORMAL
      this.currentSituation = 'NORMAL';
      this._justKickedOff = false;
    } else if (result.nextSituation) {
      this.currentSituation = result.nextSituation;
    } else if (this.currentSituation === 'KICK_OFF') {
      this.currentSituation = 'NORMAL';
    }
    // Log console propre pour chaque action principale
    if (result.isEvent || result.eventSubtype) {
      // console.log supprimé
    }
    // Log
    this.log(result.isEvent ? 'EVENT' : 'ACTION', result.logMessage, bag, token);
    this.currentTime += result.customDuration || token.duration || 5;
  }

  private log(type: 'EVENT' | 'ACTION', text: string, bag?: Token[], drawnToken?: Token, eventSubtype?: string, playerName?: string) {
    this.logs.push({
      time: this.currentTime,
      type,
      text,
      teamId: this.possessionTeamId,
      possessionTeamId: this.possessionTeamId,
      ballPosition: { ...this.ballPosition },
      bag: bag ? bag.map(t => ({ type: t.type, teamId: t.teamId, id: t.id })) : undefined,
      drawnToken: drawnToken ? { type: drawnToken.type, teamId: drawnToken.teamId, id: drawnToken.id, position: drawnToken.position } : undefined,
      eventSubtype,
      playerName
    } as MatchLog);
  }
}