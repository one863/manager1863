import { GridPosition, Token, MatchSituation } from "./types";
import { TOKEN_LOGIC } from "./config/token-logic";
import { ZONES_CONFIG, ZoneDefinitionSplit, DEFAULT_ZONE_CONFIG } from "./config/zones-config";
import { TokenPlayer } from "./token-player";

export class GridEngine {
  
  public buildBag(
    pos: GridPosition, 
    sit: MatchSituation, 
    possessionTeamId: number, 
    homeId: number, 
    awayId: number,
    players: TokenPlayer[]
  ): Token[] {
    
    // 1. GESTION DES SITUATIONS FIXES
    if (sit !== 'NORMAL' && sit !== 'KICK_OFF_RESTART') {
        const opponentId = (possessionTeamId === homeId ? awayId : homeId);
        return this.buildSituationBag(sit, possessionTeamId, opponentId, players);
    }

    // 2. RÉCUPÉRATION DE LA CONFIGURATION DE ZONE
    const zoneKey = `${pos.x},${pos.y}`;
    const opponentTeamId = (possessionTeamId === homeId) ? awayId : homeId;
    const config: ZoneDefinitionSplit = ZONES_CONFIG[zoneKey] || DEFAULT_ZONE_CONFIG;
    const validTypes = new Set(Object.keys(TOKEN_LOGIC));

    const rawList: (any & { _side: 'off' | 'def' })[] = [];
    
    if (possessionTeamId === homeId) {
        rawList.push(...(config.offenseTokensHome || []).map(t => ({ ...t, _side: 'off' as const })));
        rawList.push(...(config.defenseTokensAway || []).map(t => ({ ...t, _side: 'def' as const })));
    } else {
        rawList.push(...(config.offenseTokensAway || []).map(t => ({ ...t, _side: 'off' as const })));
        rawList.push(...(config.defenseTokensHome || []).map(t => ({ ...t, _side: 'def' as const })));
    }

    const isCenterZone = pos.x >= 2 && pos.x <= 3;

    // 3. GÉNÉRATION DU SAC INCARNÉ
    const bag: Token[] = rawList
        .filter(pt => {
            const isValidType = typeof pt.type === 'string' && validTypes.has(pt.type);
            // Sécurité : Pas de GK au milieu, sauf si c'est une action spécifique de relance
            if (isCenterZone && pt.type?.includes('GK') && pt.type !== 'GK_LONG') return false; 
            return isValidType;
        })
        .map((pt, idx) => {
            const teamId = pt._side === 'off' ? possessionTeamId : opponentTeamId;
            
            // Recherche optimisée du joueur par rôle
            const player = players.find(p => p.teamId === teamId && p.role === pt.role)
                           || players.find(p => p.teamId === teamId); 

            let finalType = pt.type as string;

            // --- LOGIQUE DE MUTATION DYNAMIQUE ---
            if (player && player.fatigue > 80) {
                const tiredVariant = `${finalType}_TIRED`;
                if (validTypes.has(tiredVariant)) {
                    finalType = tiredVariant;
                }
            }

            return {
                id: `tk-${zoneKey}-${pt.role}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
                type: finalType,
                ownerId: player ? player.id : 0,
                teamId: teamId,
                duration: pt.duration || 5,
                position: pt.role || "??", 
                role: pt.role
            };
        });

    if (bag.length === 0) {
        bag.push(this.createFallbackToken(possessionTeamId));
    }

    return this.shuffle(bag);
  }

  private buildSituationBag(sit: MatchSituation, teamId: number, opponentTeamId: number, players: TokenPlayer[]): Token[] {
      const tokens: Token[] = [];
      let index = 0;

      const addToSit = (type: string, tid: number, role: string) => {
          const player = players.find(p => p.teamId === tid && p.role === role) 
                         || players.find(p => p.teamId === tid);

          const finalType = (player && player.fatigue > 85 && TOKEN_LOGIC[`${type}_TIRED`]) 
                            ? `${type}_TIRED` 
                            : type;

          tokens.push({
              id: `sit-${sit}-${index++}`, 
              type: finalType,
              ownerId: player ? player.id : 0,
              teamId: tid,
              duration: 10,
              position: role,
              role: role
          });
      };

      switch(sit) {
          case 'KICK_OFF':
              addToSit('PASS_BACK', teamId, 'MC');
              addToSit('PASS_SHORT', teamId, 'MC');
              break;
          case 'CORNER':
              addToSit('CORNER_GOAL', teamId, 'ST');
              addToSit('CROSS', teamId, 'AML');
              addToSit('CORNER_CLEARED', opponentTeamId, 'DC');
              break;
          case 'GOAL_KICK':
              addToSit('GK_SHORT', teamId, 'GK');
              addToSit('GK_LONG', teamId, 'GK');
              break;
          case 'PENALTY':
              addToSit('PENALTY_GOAL', teamId, 'ST');
              addToSit('PENALTY_SAVED', opponentTeamId, 'GK');
              break;
          default:
              addToSit('PASS_SHORT', teamId, 'MC');
      }
      return this.shuffle(tokens);
  }

  private createFallbackToken(teamId: number): Token {
      return { 
          id: 'fb-' + Math.random(), 
          type: 'PASS_SHORT', 
          ownerId: 0, 
          teamId: teamId, 
          duration: 5, 
          position: 'MC' 
      };
  }

  public shuffle(array: Token[]): Token[] {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}