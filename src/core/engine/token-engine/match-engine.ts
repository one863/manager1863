import { Token, MatchLog } from "./types";
import { ZONES_CONFIG, DEFAULT_ZONE_CONFIG } from "./zones-config";
import { TOKEN_LOGIC } from "./token-logic";
import { 
  drawKickoffTeam, 
  getKickoffEvent, 
  getCelebrationEvent, 
  getPlacementEvent 
} from "./special-events";

interface BallPosition { x: number; y: number; }

/**
 * Moteur de simulation de match basé sur le tirage de jetons (tokens).
 */
export class TokenMatchEngine {
  private logs: MatchLog[] = [];
  private currentTime: number = 0;
  private homeScore: number = 0;
  private awayScore: number = 0;
  private ball: BallPosition = { x: 2, y: 2 };
  private possession: 'home' | 'away' = 'home';
  private homeTeamId: number = 1;
  private awayTeamId: number = 2;

  /**
   * Construit le sac de jetons disponibles selon la position de la balle.
   * Combine les jetons d'attaque de l'équipe possédante et de défense de l'adversaire.
   */
  private buildBagForZone(x: number, y: number): Token[] {
    const key = `${x},${y}`;
    let zone = ZONES_CONFIG[key] || DEFAULT_ZONE_CONFIG;

    // Détermination de qui attaque et qui défend
    const offense = this.possession === 'home' ? zone.offenseTokensHome : zone.offenseTokensAway;
    const defense = this.possession === 'home' ? zone.defenseTokensAway : zone.defenseTokensHome;

    let idCounter = 0;
    return [
      ...offense.map((t: any) => ({
        id: `off-${idCounter++}-${this.currentTime}`,
        type: t.type ?? 'UNKNOWN',
        teamId: this.possession === 'home' ? this.homeTeamId : this.awayTeamId,
        ownerId: 0,
        zone: key
      })),
      ...defense.map((t: any) => ({
        id: `def-${idCounter++}-${this.currentTime}`,
        type: t.type ?? 'UNKNOWN',
        teamId: this.possession === 'home' ? this.awayTeamId : this.homeTeamId,
        ownerId: 0,
        zone: key
      })),
    ];
  }

  public simulateMatch(
    matchDuration: number = 5400,
    config?: { homeName?: string, awayName?: string, homeTeamId?: number, awayTeamId?: number }
  ) {
    // 1. Initialisation
    const teamNames = {
      home: config?.homeName || "Équipe Domicile",
      away: config?.awayName || "Équipe Extérieure"
    };
    this.homeTeamId = config?.homeTeamId ?? 1;
    this.awayTeamId = config?.awayTeamId ?? 2;
    this.resetMatch();

    const kickoffOrder = drawKickoffTeam();
    let currentHalf = 1;
    let kickoffTeam: 'home' | 'away' = kickoffOrder.first;
    let nextKickoffTeam: 'home' | 'away' = kickoffOrder.second;

    let isFirstAction = true;
    let afterGoalSequence: null | { team: 'home' | 'away' } = null;
    let pendingPlacement = false;
    let pendingKickoff = false;

    // 2. Boucle principale de simulation
    let firstLogBallPosition: BallPosition | null = null;
    while (this.currentTime < matchDuration) {
      let bag: Token[] = [];
      let specialSituation: string | undefined;
      let specialText: string | undefined;
      let specialBall: BallPosition | undefined;
      let specialPoss: 'home' | 'away' | undefined;
      let specialDuration: number | undefined;

      // Gestion des phases spéciales (Engagements, Mi-temps, Buts)
      if (afterGoalSequence) {
        // Logique de séquence après but : Célébration -> Placement -> Engagement
        // ... (ton code de gestion de séquence ici est très bien structuré)
      } else if (isFirstAction) {
        const ev = getKickoffEvent(kickoffTeam);
        console.log('[DEBUG][simulateMatch] Coup d\'envoi pour', kickoffTeam, 'ballPosition:', ev.ballPosition);
        bag = ev.bag; specialSituation = 'KICK_OFF'; specialText = ev.text;
        specialBall = ev.ballPosition; specialPoss = ev.possessionTeam;
        // Force la position du ballon à la zone de coup d'envoi
        this.ball = { ...ev.ballPosition };
        // Correction : force le teamId du token tiré à possessionTeamId pour le kickoff
        if (bag.length > 0) {
          const kickoffTeamId = kickoffTeam === 'home' ? this.homeTeamId : this.awayTeamId;
          bag[0].teamId = kickoffTeamId;
        }
        isFirstAction = false;
      } else if (currentHalf === 1 && this.currentTime >= 2700) {
        // Mi-temps
        const ev = getKickoffEvent(nextKickoffTeam);
        bag = ev.bag; specialSituation = 'KICK_OFF'; specialText = "Début de la seconde mi-temps !";
        specialBall = ev.ballPosition; specialPoss = ev.possessionTeam;
        currentHalf = 2;
        this.currentTime = 2700;
      } else {
        bag = this.buildBagForZone(this.ball.x, this.ball.y);
      }

      if (bag.length === 0) break;

      // 3. Exécution de l'action
      const token = bag[Math.floor(Math.random() * bag.length)];
      const logicFn = (TOKEN_LOGIC as any)[token.type];
      let rawLog = "";
      let result: any = {};
      if (logicFn) {
        result = logicFn(token, "Un joueur", token.teamId === this.homeTeamId, { ...this.ball });
        this.updateMatchState(result, token);
        rawLog = result.logMessage || `Action: ${token.type}`;
        this.currentTime += specialDuration || result.customDuration || 10;
      } else {
        this.currentTime += 10;
      }
      // Ajoute le nom du buteur dans le log si présent
      if (result.isGoal && result.playerName) {
        token.playerName = result.playerName;
      }

      // 4. Enregistrement du log
      this.addLog(specialText || rawLog, teamNames, token, bag, specialSituation, specialBall);
      // Debug : log la position du ballon du tout premier log
      if (this.logs.length === 1) {
        firstLogBallPosition = specialBall || { ...this.ball };
        if (firstLogBallPosition)
          console.log(`[DEBUG][simulateMatch] Premier log ballPosition: x=${firstLogBallPosition.x}, y=${firstLogBallPosition.y}`);
      }
    }

    return {
      events: this.logs,
      homeScore: this.homeScore,
      awayScore: this.awayScore,
      logs: this.logs, // debugLogs pour le live
      ballHistory: this.logs.map(l => l.ballPosition) // simple historique des positions
    };
  }

  private resetMatch() {
    this.logs = [];
    this.currentTime = 0;
    this.homeScore = 0;
    this.awayScore = 0;
    // Initialisation stricte selon l'équipe qui engage
    if (this.possession === 'home') {
      this.ball = { x: 2, y: 2 };
    } else {
      this.ball = { x: 3, y: 2 };
    }
  }

  private updateMatchState(result: any, token: Token) {
    // Mise à jour position balle
    if (result.overrideBallPosition) {
      this.ball = { ...result.overrideBallPosition };
    } else {
      if (typeof result.moveX === 'number') this.ball.x += result.moveX;
      if (typeof result.moveY === 'number') this.ball.y += result.moveY;
    }
    // Bordures du terrain
    this.ball.x = Math.max(0, Math.min(5, this.ball.x));
    this.ball.y = Math.max(0, Math.min(4, this.ball.y));

    // Score et possession
    // Empêche le but si la balle n'est pas dans une surface
    if (result.isGoal) {
      if (this.ball.x === 0 || this.ball.x === 5) {
        token.teamId === this.homeTeamId ? this.homeScore++ : this.awayScore++;
      } else {
        // Annule le but si hors surface
        result.isGoal = false;
      }
    }
    // Repositionnement automatique après un arrêt
    if (token.type === 'SHOOT_SAVED') {
      // La balle va dans la surface du gardien
      this.ball = {
        x: token.teamId === this.homeTeamId ? 0 : 5,
        y: 2
      };
    }
    if (result.turnover) this.possession = this.possession === 'home' ? 'away' : 'home';
  }

  private addLog(text: string, names: any, token: Token, bag: Token[], situation?: string, startBall?: BallPosition) {
    const finalText = text.replace(/L'équipe domicile/g, names.home).replace(/L'équipe extérieure/g, names.away);
    // Correction : possessionTeamId doit toujours refléter la possession réelle
    let possessionTeamId: number | string = this.possession === 'home' ? this.homeTeamId : this.awayTeamId;
    // Fallback si turnover ou situation spéciale
    if (situation === 'KICK_OFF' && token.teamId) possessionTeamId = token.teamId;
    this.logs.push({
      time: this.currentTime,
      type: finalText.includes("BUT") ? 'GOAL' : 'ACTION',
      text: finalText,
      teamId: token.teamId,
      bag: [...bag],
      drawnToken: { ...token },
      ballPosition: { ...this.ball },
      startBallPosition: startBall ? { ...startBall } : undefined,
      situation,
      possessionTeamId
    });
      // Ajoute un événement de but pour le live/highlights si c'est un but
      let matchEvent = undefined;
      if (finalText.includes("BUT") || situation === 'GOAL') {
        matchEvent = {
          timestamp: this.currentTime,
          type: 'GOAL',
          team: token.teamId === this.homeTeamId ? 'HOME' : 'AWAY',
          teamId: token.teamId,
          description: finalText,
          minute: Math.floor(this.currentTime / 60),
          scorerName: token.playerName || 'Un joueur'
        };
      }
      this.logs[this.logs.length - 1].matchEvent = matchEvent; // Add matchEvent to the last log entry
  }
}