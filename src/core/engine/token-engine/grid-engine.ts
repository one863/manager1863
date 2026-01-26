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
    // Autres actions offensives (sans les jetons GK qui sont uniquement pour GOAL_KICK)
    const offensiveTypes = ['PASS_SHORT','PASS_LONG','PASS_BACK','PASS_SWITCH','THROUGH_BALL','CUT_BACK','DRIBBLE','HEAD_PASS','REBOUND','OWN_GOAL','FREE_KICK_CROSS','CORNER_SHORT','CORNER_OVERCOOKED'];
    // Jetons défensifs de base (disponibles partout)
    const defensiveTypesBase = ['TACKLE','INTERCEPT','DUEL_WON'];
    // Jetons défensifs zonaux (limités à certaines zones)
    const defensiveTypesBlock = ['BLOCK']; // Surface défensive uniquement
    const defensiveTypesPressing = ['PRESSING_SUCCESS']; // Camp adverse uniquement (pressing haut)
    const defensiveTypesRecovery = ['BALL_RECOVERY']; // Milieu de terrain
    const defensiveTypesGK = ['CLAIM','PUNCH']; // Surface défensive uniquement (gardien)
    const gkTypes = ['GK_SHORT', 'GK_LONG', 'GK_BOULETTE', 'GK_POSSESSION']; // Jetons gardien uniquement pour situations spéciales

    // Calcul des zones pour l'équipe qui défend (opponentTeamId)
    const isDefensiveZoneForOpponent = (opponentTeamId === homeId && pos.x <= 1) || (opponentTeamId === awayId && pos.x >= 4);
    const isMidfieldZone = pos.x >= 2 && pos.x <= 3;
    const isPressingZoneForOpponent = (opponentTeamId === homeId && pos.x >= 3) || (opponentTeamId === awayId && pos.x <= 2);

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
        } else if (defensiveTypesBase.includes(pt.type as string)) {
            // Jetons défensifs de base : disponibles partout
            bag.push({
                id: `sys-${zoneKey}-${index}`,
                type: pt.type as TokenType,
                ownerId: 0,
                teamId: opponentTeamId,
                quality: pt.quality || 30,
                duration: pt.duration || 5
            });
        } else if (defensiveTypesBlock.includes(pt.type as string) || defensiveTypesGK.includes(pt.type as string)) {
            // BLOCK, CLAIM, PUNCH : uniquement dans la surface défensive
            if (isDefensiveZoneForOpponent) {
                bag.push({
                    id: `sys-${zoneKey}-${index}`,
                    type: pt.type as TokenType,
                    ownerId: 0,
                    teamId: opponentTeamId,
                    quality: pt.quality || 30,
                    duration: pt.duration || 5
                });
            }
        } else if (defensiveTypesPressing.includes(pt.type as string)) {
            // PRESSING_SUCCESS : uniquement dans le camp adverse (pressing haut)
            if (isPressingZoneForOpponent) {
                bag.push({
                    id: `sys-${zoneKey}-${index}`,
                    type: pt.type as TokenType,
                    ownerId: 0,
                    teamId: opponentTeamId,
                    quality: pt.quality || 30,
                    duration: pt.duration || 5
                });
            }
        } else if (defensiveTypesRecovery.includes(pt.type as string)) {
            // BALL_RECOVERY : uniquement au milieu de terrain
            if (isMidfieldZone) {
                bag.push({
                    id: `sys-${zoneKey}-${index}`,
                    type: pt.type as TokenType,
                    ownerId: 0,
                    teamId: opponentTeamId,
                    quality: pt.quality || 30,
                    duration: pt.duration || 5
                });
            }
        } else if (pt.type === 'CLEARANCE') {
            // CLEARANCE : disponible uniquement dans les zones défensives de l'équipe qui défend
            const isDefensiveZoneHome = pos.x <= 2; // Zones 0, 1, 2 = défense home
            const isDefensiveZoneAway = pos.x >= 3; // Zones 3, 4, 5 = défense away
            // L'équipe qui défend = opponentTeamId (équipe sans possession)
            if ((opponentTeamId === homeId && isDefensiveZoneHome) || 
                (opponentTeamId === awayId && isDefensiveZoneAway)) {
                bag.push({
                    id: `sys-${zoneKey}-${index}`,
                    type: pt.type as TokenType,
                    ownerId: 0,
                    teamId: opponentTeamId,
                    quality: pt.quality || 30,
                    duration: pt.duration || 5
                });
            }
        } else if (pt.type === 'CROSS') {
            // CROSS : disponible uniquement dans les zones offensives de l'équipe en possession
            const isOffensiveZoneHome = pos.x >= 3; // Zones 3, 4, 5 = attaque home
            const isOffensiveZoneAway = pos.x <= 2; // Zones 0, 1, 2 = attaque away
            // L'équipe en possession peut centrer depuis le camp adverse
            if ((possessionTeamId === homeId && isOffensiveZoneHome) || 
                (possessionTeamId === awayId && isOffensiveZoneAway)) {
                bag.push({
                    id: `sys-${zoneKey}-${index}`,
                    type: pt.type as TokenType,
                    ownerId: 0,
                    teamId: possessionTeamId,
                    quality: pt.quality || 30,
                    duration: pt.duration || 5
                });
            }
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
              // Coup d'envoi : passe en retrait ou latérale vers un coéquipier (réaliste)
              create('PASS_BACK', 70);
              create('PASS_SWITCH', 30);
              break;
          case 'CORNER':
              // Défense (adverse) - réduit pour plus de buts sur corner
              create('CORNER_CLEARED', 35, opponentTeamId);
              create('PUNCH', 8, opponentTeamId);
              create('CLAIM', 12, opponentTeamId);
              // Attaque (équipe en possession) - augmenté
              create('CORNER_SHORT', 15, teamId);
              create('CORNER_GOAL', 15, teamId);  // Triplé : ~15% de chance de but
              create('HEAD_SHOT', 10, teamId);    // Tête non cadrée
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
              // Zone de rebond : situation chaotique, toutes les équipes peuvent récupérer
              create('REBOUND', 25, teamId);
              create('SHOOT_GOAL', 15, teamId);
              create('SHOOT_SAVED', 10, teamId);
              create('BLOCK', 20, opponentTeamId);
              create('CLEARANCE', 15, opponentTeamId);
              create('CLAIM', 10, opponentTeamId);
              create('DUEL_WON', 5, opponentTeamId);
              break;
          case 'FREE_KICK':
              create('FREE_KICK_CROSS', 50); 
              create('FREE_KICK_SHOT', 15);
              create('FREE_KICK_WALL', 25, opponentTeamId);
              create('BLOCK', 10, opponentTeamId);
              break;
          case 'VAR_ZONE':
              // Le VAR décide : la plupart du temps ça confirme la décision
              create('SYSTEM', 100); // Le système gère, la décision sera prise par le moteur
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

  /**
   * Tirage pondéré par la qualité des jetons.
   * Un jeton avec quality=50 a 5× plus de chances d'être tiré qu'un jeton avec quality=10.
   */
  public drawWeighted(bag: Token[]): Token | null {
    if (bag.length === 0) return null;
    
    // Calcul de la somme totale des qualités
    const totalQuality = bag.reduce((sum, t) => sum + Math.max(1, t.quality), 0);
    
    // Tirage aléatoire pondéré
    let roll = Math.random() * totalQuality;
    
    for (const token of bag) {
      roll -= Math.max(1, token.quality);
      if (roll <= 0) return token;
    }
    
    // Fallback (ne devrait pas arriver)
    return bag[0];
  }
}
