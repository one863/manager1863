import { GridPosition, Token, MatchSituation } from "./types";
import { TOKEN_LOGIC } from "./config/token-logic";
import { ZONES_CONFIG, ZoneDefinitionSplit, DEFAULT_ZONE_CONFIG } from "./config/zones-config";

export class GridEngine {
  public buildBag(pos: GridPosition, sit: MatchSituation, possessionTeamId: number, homeId: number, awayId: number): Token[] {
    if (sit !== 'NORMAL') return this.buildSituationBag(sit, possessionTeamId, (possessionTeamId === homeId ? awayId : homeId));

    const zoneKey = `${pos.x},${pos.y}`;
    const opponentTeamId = (possessionTeamId === homeId) ? awayId : homeId;
    const config: ZoneDefinitionSplit = ZONES_CONFIG[zoneKey] || DEFAULT_ZONE_CONFIG;
    const validTypes = new Set(Object.keys(TOKEN_LOGIC));

        // 1. Identification des bundles selon le camp
        const rawList: (Partial<Token> & { _side: 'off' | 'def' })[] = [];
        if (possessionTeamId === homeId) {
                rawList.push(...(config.offenseTokensHome || []).map(t => ({ ...t, _side: 'off' as const })));
                rawList.push(...(config.defenseTokensAway || []).map(t => ({ ...t, _side: 'def' as const })));
        } else {
                rawList.push(...(config.offenseTokensAway || []).map(t => ({ ...t, _side: 'off' as const })));
                rawList.push(...(config.defenseTokensHome || []).map(t => ({ ...t, _side: 'def' as const })));
        }

        // Remplissage du sac : chaque entrée du bundle devient un token (plus d'unicité)
        const bag: Token[] = rawList
            .filter(pt => typeof pt.type === 'string' && validTypes.has(pt.type))
            .map((pt, idx) => {
                const tokenTeamId = pt._side === 'off' ? possessionTeamId : opponentTeamId;
                // Poste réaliste basé sur la zone et le type d'action
                const position = this.getPositionForZoneAndAction(zoneKey, pt.type as string, tokenTeamId);
                return {
                    id: `sys-${zoneKey}-${pt.type}-${idx}`,
                    type: pt.type as string,
                    ownerId: 0,
                    teamId: tokenTeamId,
                    duration: pt.duration || 5,
                    position
                };
            });

        if (bag.length === 0) {
            bag.push({ id: 'sys-fallback', type: 'PASS_SHORT', ownerId: 0, teamId: possessionTeamId, duration: 5 });
        }

        return this.shuffle(bag);
  }

  private buildSituationBag(sit: MatchSituation, teamId: number, opponentTeamId: number): Token[] {
      const tokens: Token[] = [];
      
      const addToSit = (type: string, tid: number, pos?: string) => {
          tokens.push({
              id: `sit-${type}-${Date.now()}`,
              type,
              ownerId: 0,
              teamId: tid,
              duration: 10,
              position: pos || (type.includes('GK') ? 'GK' : 'MC')
          });
      };

      switch(sit) {
          case 'KICK_OFF':
              addToSit('PASS_BACK', teamId, 'MC');
              addToSit('PASS_SHORT', teamId, 'MC');
              break;
          case 'GOAL_HOME':
          case 'GOAL_AWAY':
              addToSit('PASS_SHORT', teamId, 'MC');
              addToSit('PASS_BACK', teamId, 'DC');
              break;
          case 'GOAL_CELEBRATION':
              addToSit('PASS_SHORT', teamId, 'MC');
              break;
          case 'KICK_OFF_RESTART':
              addToSit('PASS_BACK', teamId, 'DC');
              addToSit('PASS_SHORT', teamId, 'MC');
              break;
          case 'CORNER':
              addToSit('CORNER_GOAL', teamId, 'ST');
              addToSit('CROSS', teamId, 'AML');
              addToSit('CUT_BACK', teamId, 'AMR');
              addToSit('CORNER_CLEARED', opponentTeamId, 'DC');
              break;
          case 'PENALTY':
              addToSit('PENALTY_GOAL', teamId, 'ST');
              addToSit('PENALTY_MISS', teamId, 'ST');
              addToSit('PENALTY_SAVED', opponentTeamId, 'GK');
              break;
          case 'GOAL_KICK':
              addToSit('GK_SHORT', teamId, 'GK');
              addToSit('GK_LONG', teamId, 'GK');
              addToSit('PASS_SHORT', teamId, 'DC');
              break;
          case 'FREE_KICK':
              addToSit('FREE_KICK', teamId, 'AMC');
              addToSit('FREE_KICK_CROSS', teamId, 'AML');
              addToSit('FREE_KICK_SHOT', teamId, 'ST');
              addToSit('FREE_KICK_WALL', opponentTeamId, 'DC');
              break;
          case 'THROW_IN':
              addToSit('THROW_IN_SAFE', teamId, 'DL');
              addToSit('THROW_IN_LONG_BOX', teamId, 'ST');
              addToSit('THROW_IN_LOST', opponentTeamId, 'MC');
              break;
          default:
              addToSit('PASS_SHORT', teamId, 'MC');
              addToSit('PASS_BACK', teamId, 'DC');
      }
      
      return this.shuffle(tokens);
  }

  private shuffle(array: Token[]): Token[] {
    let curr = array.length;
    while (curr !== 0) {
      let rand = Math.floor(Math.random() * curr); curr--;
      [array[curr], array[rand]] = [array[rand], array[curr]];
    }
    return array;
  }

  private getPositionForZoneAndAction(zoneKey: string, tokenType: string, teamId: number): string {
    const [x, y] = zoneKey.split(',').map(Number);
    
    // Postes par défaut par zone (simplifié)
    const zoneToPosition: Record<string, string[]> = {
      '0,0': ['GK', 'DC', 'DL'],      // Zone défensive gauche
      '0,1': ['DC', 'DL', 'MC'],      // 
      '0,2': ['DC', 'MC'],            // Centre défensif
      '0,3': ['DC', 'MC', 'DR'],      // 
      '0,4': ['DC', 'DR', 'GK'],      // Zone défensive droite
      '1,0': ['DL', 'ML', 'MCL'],     // 
      '1,1': ['MC', 'MCL', 'MCR'],    // Milieu gauche
      '1,2': ['MC', 'AMC'],           // Centre
      '1,3': ['MC', 'MCR', 'MR'],     // Milieu droit
      '1,4': ['DR', 'MR', 'MCR'],     // 
      '2,0': ['ML', 'AML'],           // 
      '2,1': ['MC', 'AML', 'AMC'],    // Milieu offensif gauche
      '2,2': ['MC', 'AMC', 'ST'],     // Centre terrain
      '2,3': ['MC', 'AMR', 'ST'],     // Milieu offensif droit
      '2,4': ['MR', 'AMR'],           // 
      '3,0': ['AML', 'ST'],           // 
      '3,1': ['AML', 'ST'],           // Attaque gauche
      '3,2': ['ST', 'CF'],            // Centre attaque
      '3,3': ['ST', 'AMR'],           // Attaque droite
      '3,4': ['ST', 'MR'],            // 
      '4,0': ['ST', 'AML'],           // Surface gauche
      '4,1': ['ST', 'DC'],            // 
      '4,2': ['ST', 'GK'],            // Surface centre (tirs)
      '4,3': ['ST', 'DC'],            // 
      '4,4': ['ST', 'MR', 'AML'],     // Surface droite
      '5,0': ['ST', 'AML'],           // Zone de but gauche
      '5,1': ['ST', 'DC'],            // 
      '5,2': ['ST', 'CF'],            // Cage
      '5,3': ['ST', 'DC'],            // 
      '5,4': ['ST', 'MR', 'AML']      // Zone de but droite
    };
    
    const positions = zoneToPosition[zoneKey] || ['MC'];
    const randomPos = positions[Math.floor(Math.random() * positions.length)];
    
    // Actions spécifiques avec postes
    if (tokenType.includes('GK') || tokenType.includes('CLAIM') || tokenType.includes('PUNCH')) return 'GK';
    if (tokenType.includes('CROSS') || tokenType.includes('CUT_BACK')) return Math.random() > 0.5 ? 'AML' : 'AMR';
    if (tokenType.includes('SHOOT') || tokenType.includes('HEAD_SHOT')) return 'ST';
    if (tokenType.includes('PASS_LONG') || tokenType.includes('PASS_SWITCH')) return 'MC';
    if (tokenType.includes('TACKLE') || tokenType.includes('BLOCK') || tokenType.includes('INTERCEPT')) {
      return x <= 2 ? (y <= 2 ? 'DC' : 'DR') : (y <= 2 ? 'DC' : 'DR');
    }
    
    return randomPos;
  }

    public drawWeighted(bag: Token[]): Token | null {
        if (bag.length === 0) return null;
        // Tirage uniforme (plus de pondération quality)
        const idx = Math.floor(Math.random() * bag.length);
        return bag[idx];
    }
}