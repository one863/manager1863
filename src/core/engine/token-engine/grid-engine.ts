import { GridPosition, Token, MatchSituation, TokenType, ZoneDefinition } from "./types";
import { TokenPlayer } from "./token-player";
import { ZONES_CONFIG, DEFAULT_ZONE_CONFIG } from "./config/zones-config";

export class GridEngine {
  private players: TokenPlayer[] = [];

  constructor(players: TokenPlayer[]) {
    this.players = players;
  }

  public getPlayer(id: number): TokenPlayer | undefined {
    return this.players.find(p => p.id === id);
  }

  public buildBag(pos: GridPosition, sit: MatchSituation, possessionTeamId: number, homeId: number, awayId: number): Token[] {
    if (sit !== 'NORMAL') return this.buildSituationBag(sit, possessionTeamId, (possessionTeamId === homeId ? awayId : homeId));

    let bag: Token[] = [];
    const zoneKey = `${pos.x},${pos.y}`;
    const opponentTeamId = (possessionTeamId === homeId) ? awayId : homeId;
    const config: ZoneDefinition = ZONES_CONFIG[zoneKey] || DEFAULT_ZONE_CONFIG;

    // 1. Jetons Système (Config de zone)
    config.baseTokens.forEach((pt, index) => {
        bag.push({
            id: `sys-${zoneKey}-${index}`,
            type: pt.type as TokenType,
            ownerId: 0,
            teamId: 0, // Neutre par défaut pour le système, ou on pourrait alterner
            quality: pt.quality || 30,
            duration: pt.duration || 5
        });
    });

    // 2. Jetons Joueurs filtrés par rôle autorisé dans la zone
    this.players.forEach(p => {
      // Le joueur doit être dans une zone où son rôle est autorisé
      // On vérifie si son rôle est dans la config de la zone actuelle du ballon
      if (config.allowedRoles.includes(p.role)) {
          let weight = 0;
          if (p.activeZones.includes(zoneKey)) weight = 1.0;
          else if (p.reachZones.includes(zoneKey)) weight = 0.5;

          if (weight > 0) {
              const hasBall = (p.teamId === possessionTeamId);
              const pTokens = hasBall ? p.getOffensiveTokens(weight, pos) : p.getDefensiveTokens(weight);
              
              // S'assurer que chaque jeton a le bon ownerId et teamId
              pTokens.forEach(t => {
                  t.ownerId = p.id;
                  t.teamId = p.teamId;
              });

              bag.push(...pTokens);
          }
      }
    });

    // 3. Filtrage Spatial Final (Réalisme des tirs)
    bag = bag.filter(t => {
        if (t.type.startsWith('SHOOT') || t.type === 'HEAD_SHOT') {
            const targetX = t.teamId === homeId ? 5 : 0;
            const dx = Math.abs(targetX - pos.x);
            // Interdit si trop loin ou dans les coins morts
            if (dx > 1 || (dx === 1 && (pos.y === 0 || pos.y === 4))) return false;
        }
        return true;
    });

    if (bag.length === 0) bag.push({ id: 'sys-fallback', type: 'NEUTRAL_POSSESSION', ownerId: 0, teamId: 0, quality: 10, duration: 10 });
    return this.shuffle(bag);
  }

  private buildSituationBag(sit: MatchSituation, teamId: number, opponentTeamId: number): Token[] {
      const bag: Token[] = [];
      const create = (type: TokenType, count: number, tid: number = teamId) => {
          for(let i=0; i<count; i++) bag.push({ id: `sit-${type}-${i}`, type, ownerId: 0, teamId: tid, quality: 50, duration: 10 });
      };

      switch(sit) {
          case 'KICK_OFF':
              create('PASS_BACK', 80); create('PASS_LONG', 10); create('INTERCEPT', 10, opponentTeamId);
              break;
          case 'CORNER':
              create('CORNER_CLEARED', 50); create('CORNER_SHORT', 20); create('CORNER_GOAL', 5);
              create('PUNCH', 10); create('CLAIM', 15);
              break;
          case 'PENALTY':
              create('PENALTY_GOAL', 75); create('PENALTY_SAVED', 20); create('PENALTY_MISS', 5);
              break;
          case 'GOAL_KICK':
              create('GK_SHORT', 60); create('GK_LONG', 35); create('GK_BOULETTE', 5);
              break;
          case 'THROW_IN':
              create('THROW_IN_SAFE', 70); create('THROW_IN_LONG_BOX', 20); create('THROW_IN_LOST', 10);
              break;
          case 'REBOUND_ZONE':
              create('REBOUND', 40); create('BLOCK', 30); create('CLEARANCE', 20); create('SHOOT_GOAL', 10);
              break;
          case 'FREE_KICK':
              create('FREE_KICK_CROSS', 60); create('FREE_KICK_WALL', 30); create('FREE_KICK_SHOT', 10);
              break;
      }
      return this.shuffle(bag);
  }

  private shuffle(array: Token[]): Token[] {
    let curr = array.length;
    while (curr !== 0) {
      let rand = Math.floor(Math.random() * curr); curr--;
      [array[curr], array[rand]] = [array[rand], array[curr]];
    }
    return array;
  }
}
