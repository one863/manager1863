import { GridPosition, Token, MatchSituation, TokenType, ZoneDefinition } from "./types";
import { TOKEN_LOGIC } from "./config/token-logic";
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

    // 1. Jetons Système (Config de zone) : on ne garde que les jetons cohérents avec la possession
    const validTypes = new Set(Object.keys(TOKEN_LOGIC));
    // Types de tirs purs (inclure tous les jetons de finition)
    const shootTypes = [
        'SHOOT_GOAL',
        'SHOOT_SAVED',
        'SHOOT_SAVED_CORNER',
        'SHOOT_OFF_TARGET',
        'SHOOT_WOODWORK',
        'WOODWORK_OUT',
        'HEAD_SHOT',
        'FREE_KICK_SHOT',
        'PENALTY_GOAL',
        'PENALTY_SAVED',
        'PENALTY_MISS',
        'CORNER_GOAL'
    ];
    // Autres actions offensives
    const offensiveTypes = ['PASS_SHORT','PASS_LONG','PASS_BACK','PASS_SWITCH','THROUGH_BALL','CROSS','KEY_PASS','CUT_BACK','DRIBBLE','HEAD_PASS','REBOUND','OWN_GOAL','FREE_KICK_CROSS','CORNER_SHORT','CORNER_OVERCOOKED','GK_LONG','GK_SHORT','GK_BOULETTE'];
    const defensiveTypes = ['TACKLE','INTERCEPT','BLOCK','CLEARANCE','PRESSING_SUCCESS','BALL_RECOVERY','CLAIM','PUNCH'];

    config.baseTokens.forEach((pt: Partial<Token>, index: number) => {
        if (!pt.type || pt.type === 'NEUTRAL_POSSESSION' || !validTypes.has(pt.type as string)) return;
        // --- Gestion séparée des tirs ---
        if (shootTypes.includes(pt.type as string)) {
            // On autorise les tirs uniquement si l'équipe en possession est dans la surface adverse
            const isSurfaceHome = ["0,1","0,2","0,3"].includes(zoneKey);
            const isSurfaceAway = ["5,1","5,2","5,3"].includes(zoneKey);
            if ((possessionTeamId === homeId && isSurfaceAway) || (possessionTeamId === awayId && isSurfaceHome)) {
                bag.push({
                    id: `sys-${zoneKey}-shoot-${index}`,
                    type: pt.type as TokenType,
                    ownerId: 0,
                    teamId: possessionTeamId,
                    quality: pt.quality || 30,
                    duration: pt.duration || 5
                });
            }
        } else if (offensiveTypes.includes(pt.type as string)) {
            bag.push({
                id: `sys-${zoneKey}-${index}`,
                type: pt.type as TokenType,
                ownerId: 0,
                teamId: possessionTeamId,
                quality: pt.quality || 30,
                duration: pt.duration || 5
            });
        } else if (defensiveTypes.includes(pt.type as string)) {
            bag.push({
                id: `sys-${zoneKey}-${index}`,
                type: pt.type as TokenType,
                ownerId: 0,
                teamId: opponentTeamId,
                quality: pt.quality || 30,
                duration: pt.duration || 5
            });
        }
        // Les autres types (VAR, etc.) sont ignorés ici
    });

        // 2. Jetons Joueurs filtrés par rôle autorisé dans la zone (comparaison en majuscules)
        this.players.forEach(p => {
            const playerRole = typeof p.role === 'string' ? p.role.toUpperCase() : p.role;
            const allowedRoles = (config.allowedRoles || []).map((r: string) => r.toUpperCase());
            if (!allowedRoles.includes(playerRole)) return;

            let weight = 0;
            // Cas spécial : surface adverse, on inclut les joueurs offensifs même si leur active/reach ne couvre pas la zone
            const isSurfaceHome = ["0,1","0,2","0,3"].includes(zoneKey);
            const isSurfaceAway = ["5,1","5,2","5,3"].includes(zoneKey);
            const isAttacker = ["ST","MC","AML","AMR","LW","RW","AMC"].includes(playerRole);
            if (
                (isSurfaceHome && p.teamId === awayId && isAttacker) ||
                (isSurfaceAway && p.teamId === homeId && isAttacker)
            ) {
                weight = 1.0; // reach artificiel pour la surface adverse : on veut des tirs !
            } else if (p.activeZones.includes(zoneKey)) weight = 1.0;
            else if (p.reachZones.includes(zoneKey)) weight = 0.5;

            if (weight > 0) {
                const hasBall = (p.teamId === possessionTeamId);
                const pTokens = hasBall ? p.getOffensiveTokens(weight, pos, homeId, awayId) : p.getDefensiveTokens(weight);
                // S'assurer que chaque jeton a le bon ownerId et teamId, et type valide, et que le type existe dans TOKEN_LOGIC
                pTokens.forEach(t => {
                    if (!t.type || !validTypes.has(t.type as string)) return;
                    t.ownerId = p.id;
                    t.teamId = p.teamId;
                    if (typeof t.teamId !== 'number') t.teamId = p.teamId;
                });
                // Ne push que les tokens valides
                bag.push(...pTokens.filter(t => t.type && validTypes.has(t.type as string)));
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

    // On supprime tout jeton neutre restant (teamId: 0 ou type NEUTRAL_POSSESSION)
    bag = bag.filter(t => t.type !== 'NEUTRAL_POSSESSION' && t.teamId !== 0);
    if (bag.length === 0) {
        // Fallback : on donne la balle à l'équipe en possession
        bag.push({ id: 'sys-fallback', type: 'PASS_SHORT', ownerId: 1, teamId: possessionTeamId, quality: 10, duration: 10 });
    }
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
              // Défense (adverse)
              create('CORNER_CLEARED', 50, opponentTeamId);
              create('PUNCH', 10, opponentTeamId);
              create('CLAIM', 15, opponentTeamId);
              // Attaque (équipe en possession)
              create('CORNER_SHORT', 20, teamId);
              create('CORNER_GOAL', 5, teamId);
              break;
          case 'PENALTY':
              create('PENALTY_GOAL', 75); create('PENALTY_SAVED', 20); create('PENALTY_MISS', 5);
              break;
          case 'GOAL_KICK':
              create('GK_SHORT', 40); create('GK_LONG', 20); create('GK_BOULETTE', 5);
              // Ajout d'opposition adverse sur la relance
              create('INTERCEPT', 15, opponentTeamId); // Interception sur relance courte
              create('DUEL_WON', 15, opponentTeamId); // Duel aérien sur relance longue
              create('BALL_RECOVERY', 5, opponentTeamId); // Récupération au milieu
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
