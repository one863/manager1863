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
    if (sit !== 'NORMAL') return this.buildSituationBag(sit, possessionTeamId);

    const bag: Token[] = [];
    const zoneKey = `${pos.x},${pos.y}`;
    const zoneData = this.zoneManager.getZone(pos);

    if (zoneData?.baseTokens) {
        zoneData.baseTokens.forEach(t => {
            let team = 0;
            if (['TACKLE', 'INTERCEPT', 'SAVE', 'BLOCK', 'CLEARANCE'].includes(t.type)) {
                if (pos.x <= 1) team = homeId; else if (pos.x >= 4) team = awayId;
            } else { team = possessionTeamId; }
            bag.push({ ...t, teamId: team });
        });
    }

    this.players.forEach(p => {
      if (p.activeZones.includes(zoneKey)) bag.push(...p.getTokensForBag(1.0));
      else if (p.reachZones.includes(zoneKey)) bag.push(...p.getTokensForBag(0.5));
    });

    if (bag.length === 0) bag.push({ id: 'sys', type: 'NEUTRAL_POSSESSION', ownerId: 0, teamId: 0, quality: 10, duration: 10 });
    return this.shuffle(bag);
  }

  private buildSituationBag(sit: MatchSituation, teamId: number): Token[] {
      const bag: Token[] = [];
      const create = (type: TokenType, count: number) => {
          for(let i=0; i<count; i++) bag.push({ id: `sit-${type}-${i}`, type, ownerId: 0, teamId, quality: 50, duration: 10 });
      };

      switch(sit) {
          case 'KICK_OFF':
              create('KICK_OFF_BACK', 80); create('KICK_OFF_LONG', 20);
              break;
          case 'CORNER':
              create('CORNER_CLEARED', 50); create('CORNER_SHORT', 20); create('CORNER_GOAL', 5);
              create('PUNCH', 15); create('CLAIM', 10);
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
          case 'VAR_ZONE':
              create('PENALTY_GOAL', 50); // Le penalty est accordé
              create('SYSTEM', 50); // Le jeu reprend normalement (pas de penalty)
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
