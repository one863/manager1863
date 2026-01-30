import { Token } from './types';

export interface PlayerStats {
  passesAttempted: number;
  passesCompleted: number;
  shotsOnTarget: number;
  goals: number;
  tackles: number;
  possessionTime: number;
}

export interface TeamStats {
  passesAttempted: number;
  passesCompleted: number;
  shotsOnTarget: number;
  goals: number;
  tackles: number;
  possessionTime: number;
}

export interface MatchStats {
  teams: Record<number, TeamStats>;
  players: Record<number, PlayerStats>;
  possession: Record<number, number>; // teamId → temps de possession
}

export class StatTracker {
  private matchStats: MatchStats;
  private lastTeamId: number | null = null;
  private lastTokenTime: number = 0;

  constructor(teamIds: number[], playerIds: number[]) {
    this.matchStats = {
      teams: {},
      players: {},
      possession: {},
    };
    teamIds.forEach(id => {
      this.matchStats.teams[id] = {
        passesAttempted: 0,
        passesCompleted: 0,
        shotsOnTarget: 0,
        goals: 0,
        tackles: 0,
        possessionTime: 0,
      };
      this.matchStats.possession[id] = 0;
    });
    playerIds.forEach(id => {
      this.matchStats.players[id] = {
        passesAttempted: 0,
        passesCompleted: 0,
        shotsOnTarget: 0,
        goals: 0,
        tackles: 0,
        possessionTime: 0,
      };
    });
  }

  trackAction(token: Token, result: any) {
    const teamId = token.teamId;
    const performerId = token.performerId;
    const partnerId = token.partnerId;
    // Possession
    if (this.lastTeamId !== null && teamId !== this.lastTeamId) {
      // Turnover, calcul du temps de possession
      this.matchStats.teams[this.lastTeamId].possessionTime += this.lastTokenTime;
      this.matchStats.possession[this.lastTeamId] += this.lastTokenTime;
      this.lastTokenTime = 0;
    }
    this.lastTeamId = teamId;
    this.lastTokenTime += result.duration || 1;
    // Statistiques
    if (result.isPass) {
      this.matchStats.teams[teamId].passesAttempted++;
      this.matchStats.players[performerId].passesAttempted++;
      if (result.success) {
        this.matchStats.teams[teamId].passesCompleted++;
        this.matchStats.players[performerId].passesCompleted++;
        if (partnerId) {
          this.matchStats.players[partnerId].passesCompleted++;
        }
      }
    }
    if (result.isShot) {
      this.matchStats.teams[teamId].shotsOnTarget++;
      this.matchStats.players[performerId].shotsOnTarget++;
      if (result.isGoal) {
        this.matchStats.teams[teamId].goals++;
        this.matchStats.players[performerId].goals++;
      }
    }
    if (result.isTackle) {
      this.matchStats.teams[teamId].tackles++;
      this.matchStats.players[performerId].tackles++;
    }
    // Possession individuelle
    this.matchStats.players[performerId].possessionTime += result.duration || 1;
  }

  getMatchStats(): MatchStats {
    return this.matchStats;
  }
}
