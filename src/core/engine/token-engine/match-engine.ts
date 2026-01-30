import { Token, MatchLog, BallPosition } from "./types";
import { ZONES_CONFIG, DEFAULT_ZONE_CONFIG } from "./zones-config";
import { TOKEN_LOGIC } from "./token-logic";
import { StatTracker } from "./stat-tracker";
import { FORMATIONS, ROLE_ZONES, FormationRole } from "./formations-config";
import { 
  drawKickoffTeam, 
  getKickoffEvent, 
  getCelebrationEvent, 
  getPlacementEvent 
} from "./special-events";
import { Player } from "../../domain/player/types";

export class TokenMatchEngine {
  private logs: MatchLog[] = [];
  private currentTime: number = 0;
  private homeScore: number = 0;
  private awayScore: number = 0;
  private ball: BallPosition = { x: 2, y: 2 };
  private possession: 'home' | 'away' = 'home';
  
  private homeTeamId: number;
  private awayTeamId: number;
  private homePlayers: (Player & { role: FormationRole })[];
  private awayPlayers: (Player & { role: FormationRole })[];
  private statTracker: StatTracker;

  constructor(
    homePlayers: Player[], 
    awayPlayers: Player[], 
    homeTeamId: number, 
    awayTeamId: number, 
    homeForm = "4-4-2", 
    awayForm = "4-4-2"
  ) {
    this.homeTeamId = homeTeamId;
    this.awayTeamId = awayTeamId;

    // 1. Attribution des rôles selon la formation choisie
    this.homePlayers = this.assignRoles(homePlayers, homeForm);
    this.awayPlayers = this.assignRoles(awayPlayers, awayForm);

    // 2. Initialisation du tracker de stats avec les joueurs et leurs rôles
    // On prépare la liste complète des acteurs du match pour le tracker
    const allPlayersWithRoles = [...this.homePlayers, ...this.awayPlayers].map(p => ({
      id: p.id as number,
      role: p.role
    }));

    this.statTracker = new StatTracker(
      [homeTeamId, awayTeamId], 
      allPlayersWithRoles
    );
  }

  private assignRoles(players: Player[], formationName: string): (Player & { role: FormationRole })[] {
    const roles = FORMATIONS[formationName] || FORMATIONS["4-4-2"];
    if (players.length < 11) {
      throw new Error("Effectif incomplet : au moins 11 joueurs sont requis pour la simulation.");
    }
    // On limite à 11 joueurs pour la simulation
    return players.slice(0, 11).map((p, i) => ({ 
      ...p, 
      role: roles[i] 
    }));
  }

  /**
   * Sélectionne un joueur pertinent pour la zone actuelle.
   * Priorise les joueurs dont le rôle correspond à la zone (ex: DEF en zone basse).
   */
  private getPlayerForZone(team: 'home' | 'away', x: number, y: number): Player & { role: FormationRole } {
    const players = team === 'home' ? this.homePlayers : this.awayPlayers;
    
    // On cherche les joueurs dont le rôle est défini comme "actif" dans cette case (x, y)
    const potentialPlayers = players.filter(p => 
      ROLE_ZONES[p.role].active.some(pos => pos.x === x && pos.y === y)
    );

    // Fallback : si aucun joueur n'est assigné à cette zone, on pioche dans l'effectif complet
    return potentialPlayers.length > 0 
      ? potentialPlayers[Math.floor(Math.random() * potentialPlayers.length)]
      : players[Math.floor(Math.random() * players.length)];
  }

  private buildBagForZone(x: number, y: number): Token[] {
    const key = `${x},${y}`;
    const zone = ZONES_CONFIG[key] || DEFAULT_ZONE_CONFIG;
    const isHomeAttacking = this.possession === 'home';
    
    const offenseTokens = isHomeAttacking ? zone.offenseTokensHome : zone.offenseTokensAway;
    const defenseTokens = isHomeAttacking ? zone.defenseTokensAway : zone.defenseTokensHome;

    const bag: Token[] = [];

    // Ajout jetons offensifs (avec joueur positionné dans la zone)
    offenseTokens.forEach((t, i) => {
      const p = this.getPlayerForZone(this.possession, x, y);
      // Sélection d'un joueur secondaire différent si besoin
      let secondaryPlayer = undefined;
      if (t.narrativeTemplate?.includes("{p2}")) {
        const candidates = (this.possession === 'home' ? this.homePlayers : this.awayPlayers).filter(pl => pl.id !== p.id);
        if (candidates.length > 0) {
          const sec = candidates[Math.floor(Math.random() * candidates.length)];
          secondaryPlayer = sec;
        }
      }
      bag.push({
        id: crypto.randomUUID(),
        type: t.type!, 
        teamId: isHomeAttacking ? this.homeTeamId : this.awayTeamId,
        primaryPlayerId: p.id as number, 
        playerName: p.lastName,
        secondaryPlayerId: secondaryPlayer?.id,
        secondaryPlayerName: secondaryPlayer?.lastName,
        narrativeTemplate: t.narrativeTemplate!, 
        zone: key
      });
    });

    // Ajout jetons défensifs (avec adversaire positionné dans la zone)
    defenseTokens.forEach((t, i) => {
      const p = this.getPlayerForZone(isHomeAttacking ? 'away' : 'home', x, y);
      let secondaryPlayer = undefined;
      if (t.narrativeTemplate?.includes("{p2}")) {
        const candidates = (isHomeAttacking ? this.awayPlayers : this.homePlayers).filter(pl => pl.id !== p.id);
        if (candidates.length > 0) {
          const sec = candidates[Math.floor(Math.random() * candidates.length)];
          secondaryPlayer = sec;
        }
      }
      bag.push({
        id: crypto.randomUUID(),
        type: t.type!, 
        teamId: isHomeAttacking ? this.awayTeamId : this.homeTeamId,
        primaryPlayerId: p.id as number, 
        playerName: p.lastName,
        secondaryPlayerId: secondaryPlayer?.id,
        secondaryPlayerName: secondaryPlayer?.lastName,
        narrativeTemplate: t.narrativeTemplate!, 
        zone: key
      });
    });

    return bag;
  }

  public simulateMatch(matchDuration: number = 5400) {
    this.resetMatch();
    const kickoffOrder = drawKickoffTeam();
    let isFirstAction = true;
    let currentHalf = 1;


    while (this.currentTime < matchDuration) {
      let bag: Token[] = [];
      let result: any = null;
      let situation: string | undefined = undefined;

      // --- GESTION DES SÉQUENCES SPÉCIALES ---
      // Coup d'envoi initial
      if (isFirstAction) {
        const ev = getKickoffEvent(kickoffOrder.first);
        this.ball = ev.ballPosition;
        this.possession = ev.possessionTeam;
        situation = 'KICK_OFF';
        // Bag spécial coup d'envoi : PASS_SHORT et PASS_LATERAL pour l'équipe qui engage
        const kickoffBag = ['PASS_SHORT', 'PASS_LATERAL'].map(type => {
          const p = this.getPlayerForZone(this.possession, 2, 2);
          return {
            id: crypto.randomUUID(),
            type,
            teamId: this.possession === 'home' ? this.homeTeamId : this.awayTeamId,
            primaryPlayerId: p.id as number,
            playerName: p.lastName,
            narrativeTemplate: type === 'PASS_SHORT'
              ? '{p1} joue court pour construire.'
              : '{p1} écarte le jeu sur l\'aile.',
            zone: '2,2'
          };
        });
        this.logs.push({
          time: this.currentTime,
          type: 'KICK_OFF',
          text: ev.text,
          teamId: this.possession === 'home' ? this.homeTeamId : this.awayTeamId,
          ballPosition: { ...this.ball },
          possessionTeamId: this.possession === 'home' ? this.homeTeamId : this.awayTeamId,
          bag: kickoffBag,
          drawnToken: undefined,
          statsUpdate: {},
          situation: 'KICK_OFF'
        });
        isFirstAction = false;
        this.currentTime += 5; // Petite avance pour le coup d'envoi
        continue; // Passe à l'action suivante
      }
      // Mi-temps
      else if (currentHalf === 1 && this.currentTime >= 2700) {
        const ev = getKickoffEvent(kickoffOrder.second);
        this.ball = ev.ballPosition;
        this.possession = ev.possessionTeam;
        this.currentTime = 2700;
        currentHalf = 2;
        situation = 'KICK_OFF';
        // Bag spécial coup d'envoi 2e mi-temps
        const kickoffBag = ['PASS_SHORT', 'PASS_LATERAL'].map(type => {
          const p = this.getPlayerForZone(this.possession, 2, 2);
          return {
            id: crypto.randomUUID(),
            type,
            teamId: this.possession === 'home' ? this.homeTeamId : this.awayTeamId,
            primaryPlayerId: p.id as number,
            playerName: p.lastName,
            narrativeTemplate: type === 'PASS_SHORT'
              ? '{p1} joue court pour construire.'
              : '{p1} écarte le jeu sur l\'aile.',
            zone: '2,2'
          };
        });
        this.logs.push({
          time: this.currentTime,
          type: 'KICK_OFF',
          text: ev.text,
          teamId: this.possession === 'home' ? this.homeTeamId : this.awayTeamId,
          ballPosition: { ...this.ball },
          possessionTeamId: this.possession === 'home' ? this.homeTeamId : this.awayTeamId,
          bag: kickoffBag,
          drawnToken: undefined,
          statsUpdate: {},
          situation: 'KICK_OFF'
        });
        this.currentTime += 5;
        continue;
      }
      // Début prolongations (exemple : 90' = 5400s, 105' = 6300s, 120' = 7200s)
      else if (this.currentTime === 5400 || this.currentTime === 6300 || this.currentTime === 7200) {
        // On alterne l'équipe qui engage à chaque période supplémentaire
        const team = (currentHalf % 2 === 0) ? kickoffOrder.first : kickoffOrder.second;
        const ev = getKickoffEvent(team);
        this.ball = ev.ballPosition;
        this.possession = ev.possessionTeam;
        situation = 'KICK_OFF';
        // Bag spécial coup d'envoi prolongations
        const kickoffBag = ['PASS_SHORT', 'PASS_LATERAL'].map(type => {
          const p = this.getPlayerForZone(this.possession, 2, 2);
          return {
            id: crypto.randomUUID(),
            type,
            teamId: this.possession === 'home' ? this.homeTeamId : this.awayTeamId,
            primaryPlayerId: p.id as number,
            playerName: p.lastName,
            narrativeTemplate: type === 'PASS_SHORT'
              ? '{p1} joue court pour construire.'
              : '{p1} écarte le jeu sur l\'aile.',
            zone: '2,2'
          };
        });
        this.logs.push({
          time: this.currentTime,
          type: 'KICK_OFF',
          text: ev.text,
          teamId: this.possession === 'home' ? this.homeTeamId : this.awayTeamId,
          ballPosition: { ...this.ball },
          possessionTeamId: this.possession === 'home' ? this.homeTeamId : this.awayTeamId,
          bag: kickoffBag,
          drawnToken: undefined,
          statsUpdate: {},
          situation: 'KICK_OFF'
        });
        currentHalf++;
        this.currentTime += 5;
        continue;
      }

      bag = this.buildBagForZone(this.ball.x, this.ball.y);
      // Toujours tirer un jeton si le sac n'est pas vide, sinon on saute le tour
      if (bag.length > 0) {
        // Tirage du jeton (aléatoire)
        const token = bag[Math.floor(Math.random() * bag.length)];
        const logicFn = (TOKEN_LOGIC as any)[token.type];
        if (logicFn) {
          result = logicFn(token, token.playerName, token.teamId === this.homeTeamId, { ...this.ball });
          // 1. Enregistrement des statistiques via le tracker
          if (result.stats) {
            this.statTracker.trackAction(token.primaryPlayerId, token.teamId, result.stats);
          }
          // 2. Mise à jour de l'état du match
          this.applyActionResult(result, token);
          // 3. Enregistrement du log complet (bag, drawnToken, stats, texte...)
          this.logs.push({
            time: this.currentTime,
            type: result.isGoal ? 'GOAL' : 'ACTION',
            text: result.logMessage || token.narrativeTemplate.replace("{p1}", token.playerName),
            teamId: token.teamId,
            ballPosition: { ...this.ball },
            possessionTeamId: this.possession === 'home' ? this.homeTeamId : this.awayTeamId,
            bag: [...bag],
            drawnToken: { ...token },
            statsUpdate: result.stats || {},
            situation
          });
          // 4. Gestion de la suite après un but (séquence narrative)
          if (result.isGoal) {
            this.currentTime += 15;
            const celeb = getCelebrationEvent(this.possession === 'home' ? 'away' : 'home');
            this.logs.push({
              time: this.currentTime,
              type: 'CELEBRATION',
              text: celeb.text,
              teamId: this.possession === 'home' ? this.awayTeamId : this.homeTeamId,
              ballPosition: { ...this.ball },
              possessionTeamId: this.possession === 'home' ? this.homeTeamId : this.awayTeamId,
              bag: [],
              drawnToken: undefined,
              statsUpdate: {},
              situation: 'CELEBRATION'
            });
            this.currentTime += celeb.duration;
            const place = getPlacementEvent(this.possession);
            this.logs.push({
              time: this.currentTime,
              type: 'PLACEMENT',
              text: place.text,
              teamId: this.possession === 'home' ? this.homeTeamId : this.awayTeamId,
              ballPosition: { ...this.ball },
              possessionTeamId: this.possession === 'home' ? this.homeTeamId : this.awayTeamId,
              bag: [],
              drawnToken: undefined,
              statsUpdate: {},
              situation: 'PLACEMENT'
            });
            this.currentTime += place.duration;
          }
          this.currentTime += result.customDuration || 10;
        } else {
          // Si pas de logique, on saute le tour
          this.currentTime += 10;
        }
      } else {
        // Si le sac est vide, on saute le tour
        this.currentTime += 10;
      }
    }

    const summary = this.statTracker.getSummary();
    return {
      events: this.logs,
      homeScore: this.homeScore,
      awayScore: this.awayScore,
      stats: summary.totals,
      playerStats: summary.players,
      roleStats: summary.roles, // Nouveau : statistiques par ligne tactique
      ballHistory: this.logs.map(l => l.ballPosition)
    };
  }

  private applyActionResult(result: any, token: Token) {
    if (result.isGoal) {
      token.teamId === this.homeTeamId ? this.homeScore++ : this.awayScore++;
      this.ball = { x: 2, y: 2 };
      // L'équipe qui a encaissé le but récupère la balle pour l'engagement
      this.possession = token.teamId === this.homeTeamId ? 'away' : 'home';
      return;
    }

    if (result.turnover) {
      this.possession = this.possession === 'home' ? 'away' : 'home';
    }

    // Calcul des nouvelles coordonnées
    let newX = this.ball.x + (result.moveX || 0);
    let newY = this.ball.y + (result.moveY || 0);
    // Si sortie, replacer légèrement à l'intérieur
    if (result.isOut) {
      if (newX < 0) newX = 1;
      if (newX > 5) newX = 4;
      if (newY < 0) newY = 1;
      if (newY > 4) newY = 3;
    }
    this.ball.x = Math.max(0, Math.min(5, newX));
    this.ball.y = Math.max(0, Math.min(4, newY));
  }

  private addLog(token: Token, bag: Token[], result: any, situation?: string) {
    let text = result.logMessage || token.narrativeTemplate.replace("{p1}", token.playerName);
    if (token.secondaryPlayerName) {
      text = text.replace("{p2}", token.secondaryPlayerName);
    } else {
      text = text.replace("{p2}", "un joueur");
    }
    this.logs.push({
      time: this.currentTime,
      type: result.isGoal ? 'GOAL' : 'ACTION',
      text,
      teamId: token.teamId,
      ballPosition: { ...this.ball },
      possessionTeamId: this.possession === 'home' ? this.homeTeamId : this.awayTeamId,
      bag: [...bag],
      drawnToken: { ...token },
      statsUpdate: result.stats || {},
      situation
    });
  }

  private resetMatch() {
    this.logs = [];
    this.currentTime = 0;
    this.homeScore = 0;
    this.awayScore = 0;
    this.ball = { x: 2, y: 2 };
  }
}