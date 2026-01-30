
// Imports corrigés et types mockés pour compilation
// Remplacer par vos vrais modules et types
type BallPosition = { x: number; y: number };
type Player = { id: number; name: string; role: string; skills: Record<string, number>; reachZones?: string[] };
type Token = any;
type MatchLog = any;
const StatTracker = class { constructor(a: any, b: any) {} trackAction() {} };
const GridEngine = class { buildBag() { return []; } };
const TOKEN_LOGIC: any = {};
const drawKickoffTeam = () => ({ first: 'home', second: 'away' });
const getKickoffEvent = (team: string) => ({ ballPosition: { x: 2, y: 2 }, possessionTeam: team, text: '', duration: 10 });
const getCelebrationEvent = (team: string) => ({ ballPosition: { x: 2, y: 2 }, possessionTeam: team, text: '', duration: 10 });
const getPlacementEvent = (team: string) => ({ ballPosition: { x: 2, y: 2 }, possessionTeam: team, text: '', duration: 10 });

/**
 * Moteur de simulation de match basé sur le tirage de jetons (tokens).
 */
export class MatchEngine {
  private logs: MatchLog[] = [];
  private statTracker: InstanceType<typeof StatTracker>;
  private currentTime: number = 0;
  private homeScore: number = 0;
  private awayScore: number = 0;
  private ball: BallPosition = { x: 2, y: 2 };
  private possession: 'home' | 'away' = 'home';
  private homeTeamId: number = 1;
  private awayTeamId: number = 2;
  private homeFormation: string = 'DEFAULT_FORMATION';
  private awayFormation: string = 'DEFAULT_FORMATION';
  private lastSituation?: string;
  private gridEngine: InstanceType<typeof GridEngine>;

  constructor(homePlayers: Player[], awayPlayers: Player[], homeTeamId: number, awayTeamId: number) {
    this.gridEngine = new GridEngine();
    this.statTracker = new StatTracker([homeTeamId, awayTeamId], [...homePlayers.map(p => p.id), ...awayPlayers.map(p => p.id)]);
    this.homeTeamId = homeTeamId;
    this.awayTeamId = awayTeamId;
  }

  /**
   * Utilise GridEngine pour construire le sac de jetons selon la position et la situation.
   */
  // buildBagForZone supprimé, on utilise directement gridEngine.buildBag

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
    if (config && typeof (config as any).homeFormation === 'string') this.homeFormation = (config as any).homeFormation;
    if (config && typeof (config as any).awayFormation === 'string') this.awayFormation = (config as any).awayFormation;
    this.resetMatch();

    const kickoffOrder = drawKickoffTeam();
    let currentHalf = 1;
    let kickoffTeam = kickoffOrder.first === 'home' ? 'home' : 'away';
    let nextKickoffTeam = kickoffOrder.second === 'home' ? 'home' : 'away';

    let isFirstAction = true;
    let afterGoalSequence: null | { team: 'home' | 'away' } = null;
    let pendingPlacement = false;
    let pendingKickoff = false;
    this.lastSituation = undefined;

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
      // Orchestration pure : gestion des situations et synchronisation immédiate
      if (afterGoalSequence) {
        if (!pendingPlacement) {
          const ev = getCelebrationEvent(afterGoalSequence.team);
          if (ev.ballPosition) this.ball = { ...ev.ballPosition };
          if (ev.possessionTeam === 'home' || ev.possessionTeam === 'away') this.possession = ev.possessionTeam;
          specialSituation = 'CELEBRATION'; specialText = ev.text;
          specialDuration = ev.duration;
          bag = this.gridEngine.buildBag();
          pendingPlacement = true;
          this.lastSituation = 'CELEBRATION';
        } else if (pendingPlacement && !pendingKickoff) {
          const nextTeam = afterGoalSequence.team === 'home' ? 'away' : 'home';
          const ev = getPlacementEvent(nextTeam);
          if (ev.ballPosition) this.ball = { ...ev.ballPosition };
          if (ev.possessionTeam === 'home' || ev.possessionTeam === 'away') this.possession = ev.possessionTeam;
          specialSituation = 'PLACEMENT'; specialText = ev.text;
          specialDuration = ev.duration;
          bag = this.gridEngine.buildBag();
          pendingKickoff = true;
          this.lastSituation = 'PLACEMENT';
        } else if (pendingKickoff) {
          const nextTeam = afterGoalSequence.team === 'home' ? 'away' : 'home';
          const ev = getKickoffEvent(nextTeam);
          if (ev.ballPosition) this.ball = { ...ev.ballPosition };
          if (ev.possessionTeam === 'home' || ev.possessionTeam === 'away') this.possession = ev.possessionTeam;
          specialSituation = 'KICK_OFF'; specialText = ev.text;
          bag = this.gridEngine.buildBag();
          afterGoalSequence = null;
          pendingPlacement = false;
          pendingKickoff = false;
          this.lastSituation = 'KICK_OFF';
        }
      } else if (isFirstAction) {
        const ev = getKickoffEvent(kickoffTeam);
        if (ev.ballPosition) this.ball = { ...ev.ballPosition };
        if (ev.possessionTeam === 'home' || ev.possessionTeam === 'away') this.possession = ev.possessionTeam;
        specialSituation = 'KICK_OFF'; specialText = ev.text;
        bag = this.gridEngine.buildBag();
        isFirstAction = false;
        this.lastSituation = 'KICK_OFF';
      } else if (currentHalf === 1 && this.currentTime >= 2700) {
        const ev = getKickoffEvent(nextKickoffTeam);
        if (ev.ballPosition) this.ball = { ...ev.ballPosition };
          if (ev.possessionTeam === 'home' || ev.possessionTeam === 'away') this.possession = ev.possessionTeam;
        specialSituation = 'KICK_OFF'; specialText = "Début de la seconde mi-temps !";
          bag = this.gridEngine.buildBag();
        currentHalf = 2;
        this.currentTime = 2700;
        this.lastSituation = 'KICK_OFF';
      } else {
        bag = this.gridEngine.buildBag();
        this.lastSituation = undefined;
      }

      // Vérification juste avant le tirage du jeton : appliquer specialBall si définie
      if (specialBall) {
        this.ball = { ...specialBall };
      }

      if (bag.length === 0) break;

      // Tirage du jeton
      const token = bag[0];
      const logicFn = (TOKEN_LOGIC as any)[token?.type];
      let result: any = {};
      const startBallPosition = { ...this.ball };
      if (logicFn && token) {
        result = logicFn(token, token.playerName || "Un joueur", token.teamId === this.homeTeamId, startBallPosition);
        this.updateMatchState(result, token);
        this.statTracker.trackAction();
        this.currentTime += specialDuration || result.customDuration || 10;
        if (result.isGoal) {
          afterGoalSequence = { team: token.teamId === this.homeTeamId ? 'home' : 'away' };
          this.ball = { x: 2, y: 2 };
        }
        if (result.nextSituation) {
          this.lastSituation = result.nextSituation;
        }
      } else {
        this.currentTime += 10;
      }
      if (result.isGoal && result.playerName && token) {
        token.playerName = result.playerName;
      }

      // Narration dynamique
      let logText = token?.narrativeTemplate || '';
      if (token?.playerName) logText = logText.replace('{player}', token.playerName);
      if (result.partnerName) logText = logText.replace('{partner}', result.partnerName);
      if (result.narrative) logText = result.narrative;
      // 4. Enregistrement du log
      this.addLog(specialText || logText, teamNames, token, bag, specialSituation, specialBall, result.turnover);
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
    // Toujours initialiser au centre
    this.ball = { x: 2, y: 2 };
  }

  private updateMatchState(result: any, token: Token) {
    // Mise à jour position balle
    if (result.overrideBallPosition) {
      this.ball = { ...result.overrideBallPosition };
    } else {
      if (typeof result.moveX === 'number') {
        this.ball.x = Math.max(0, Math.min(5, this.ball.x + result.moveX));
      }
      if (typeof result.moveY === 'number') {
        this.ball.y = Math.max(0, Math.min(4, this.ball.y + result.moveY));
      }
    }
    // Possession
    if (result.turnover) {
      this.possession = this.possession === 'home' ? 'away' : 'home';
    }
    // Score
    if (result.isGoal) {
      if (this.possession === 'home') {
        this.homeScore++;
      } else {
        this.awayScore++;
      }
    }
  }

  private addLog(text: string, names: any, token: Token, bag: Token[], situation?: string, startBall?: BallPosition, turnover?: boolean) {
    let roleText = '';
    if (token.suggestedRole) {
      const teamLabel = token.teamId === this.homeTeamId ? names.home : names.away;
      roleText = `Le ${token.suggestedRole.toLowerCase()} de l'équipe ${teamLabel} `;
    }
    const finalText = (roleText ? roleText : '') + text.replace(/L'équipe domicile/g, names.home).replace(/L'équipe extérieure/g, names.away);
    let possessionTeamId: number | string = this.possession === 'home' ? this.homeTeamId : this.awayTeamId;
    if (turnover) possessionTeamId = token.teamId === this.homeTeamId ? this.awayTeamId : this.homeTeamId;
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