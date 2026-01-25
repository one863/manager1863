import { GridPosition, Token, MatchSituation, TokenType } from "./types";
import { TokenPlayer } from "./token-player";
import { ZoneManager } from "./zone-manager";

export class GridEngine {
  private players: TokenPlayer[] = [];
  private zoneManager: ZoneManager;

  constructor(players: TokenPlayer[]) {
    this.players = players;
    this.zoneManager = new ZoneManager();
  }

  public getPlayer(id: number): TokenPlayer | undefined {
    return this.players.find(p => p.id === id);
  }

  public buildBag(pos: GridPosition, sit: MatchSituation, possessionTeamId: number, homeId: number, awayId: number): Token[] {
    if (sit !== 'NORMAL') return this.buildSituationBag(sit, possessionTeamId, (possessionTeamId === homeId ? awayId : homeId));

    let bag: Token[] = [];
    const zoneKey = `${pos.x},${pos.y}`;
    const opponentTeamId = (possessionTeamId === homeId) ? awayId : homeId;

    // 1. Jetons Système (Équilibrage territorial)
    const isGoalZone = (pos.x === 0 || pos.x === 5);
    
    // Si on est dans la zone de but, le système injecte plus d'interceptions/dégagements
    const defPressure = isGoalZone ? 10 : 3;
    for(let i=0; i<defPressure; i++) bag.push({ id: `sys-def-${i}`, type: 'INTERCEPT', ownerId: 0, teamId: opponentTeamId, quality: 5, duration: 3 });
    for(let i=0; i<5; i++) bag.push({ id: `sys-off-${i}`, type: 'PASS_SHORT', ownerId: 0, teamId: possessionTeamId, quality: 5, duration: 5 });

    // 2. Jetons Joueurs
    this.players.forEach(p => {
      let weight = 0;
      if (p.activeZones.includes(zoneKey)) weight = 1.0;
      else if (p.reachZones.includes(zoneKey)) weight = 0.5;

      if (weight > 0) {
          const hasBall = (p.teamId === possessionTeamId);
          const pTokens = hasBall ? p.getOffensiveTokens(weight, pos) : p.getDefensiveTokens(weight);
          bag.push(...pTokens);
      }
    });

    // 3. Filtrage Spatial Final
    bag = bag.filter(t => {
        if (t.type.startsWith('SHOOT') || t.type === 'HEAD_SHOT') {
            const targetX = t.teamId === homeId ? 5 : 0;
            const dx = Math.abs(targetX - pos.x);
            if (dx > 1 || (dx === 1 && (pos.y === 0 || pos.y === 4))) return false;
        }
        return true;
    });

    if (bag.length === 0) bag.push({ id: 'sys', type: 'NEUTRAL_POSSESSION', ownerId: 0, teamId: 0, quality: 10, duration: 10 });
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
