import { FormationRole } from "./formations-config";

export type StatMap = Record<string, number>;

export class StatTracker {
  private playerStats: Map<number, StatMap> = new Map();
  private teamStats: Map<number, StatMap> = new Map();
  // Nouveau : Stats par rôle pour l'analyse tactique
  private roleStats: Map<FormationRole, StatMap> = new Map();
  // Nouveau : Mapping pour savoir quel joueur a quel rôle
  private playerToRole: Map<number, FormationRole> = new Map();

  /**
   * @param teamIds IDs des équipes
   * @param players Liste des joueurs avec leurs rôles assignés par le moteur
   */
  constructor(teamIds: number[], players: { id: number, role: FormationRole }[]) {
    teamIds.forEach(id => this.teamStats.set(id, {}));
    
    // Initialisation des joueurs et du mapping de rôle
    players.forEach(p => {
      this.playerStats.set(p.id, {});
      this.playerToRole.set(p.id, p.role);
      
      // Initialisation de la map des rôles (GK, DEF, etc.)
      if (!this.roleStats.has(p.role)) {
        this.roleStats.set(p.role, {});
      }
    });
  }

  public trackAction(playerId: number, teamId: number, increments: StatMap) {
    if (!increments) return;

    // 1. Stats Joueur
    this.updateEntry(this.playerStats, playerId, increments);

    // 2. Stats Équipe
    this.updateEntry(this.teamStats, teamId, increments);

    // 3. Stats par Rôle (Adaptation tactique)
    const role = this.playerToRole.get(playerId);
    if (role) {
      this.updateEntry(this.roleStats, role, increments);
    }
  }

  private updateEntry(map: Map<any, StatMap>, key: any, increments: StatMap) {
    const current = map.get(key) || {};
    for (const [statName, value] of Object.entries(increments)) {
      current[statName] = (current[statName] || 0) + value;
    }
    map.set(key, current);
  }

  public getSummary() {
    return {
      players: Object.fromEntries(this.playerStats),
      teams: Object.fromEntries(this.teamStats),
      roles: Object.fromEntries(this.roleStats), // Permet de voir "Performance des DEF", etc.
      totals: this.calculateGlobalTotals()
    };
  }

  private calculateGlobalTotals() {
    const teamIds = Array.from(this.teamStats.keys());
    const stats: any = {
      shots: { home: 0, away: 0 },
      passes: { home: 0, away: 0 },
      interceptions: { home: 0, away: 0 }
    };

    teamIds.forEach((id, index) => {
      const side = index === 0 ? 'home' : 'away';
      const data = this.teamStats.get(id) || {};
      stats.shots[side] = data.shots || 0;
      stats.passes[side] = data.passes || 0;
      stats.interceptions[side] = data.interceptions || 0;
    });

    return stats;
  }
}