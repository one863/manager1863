import { GridPosition, Token, MatchSituation, TokenType } from "./types";
import { TOKEN_LOGIC } from "./config/token-logic";
import { TokenPlayer } from "./token-player";
import { ZONES_CONFIG, ZoneDefinitionSplit } from "./config/zones-config";

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
    const config: ZoneDefinitionSplit = ZONES_CONFIG[zoneKey];

    // 1. Jetons Système (Config de zone) : on ne garde que les jetons cohérents avec la possession
    const validTypes = new Set(Object.keys(TOKEN_LOGIC));
    // Types de tirs REUSSIS (jetons offensifs - appartiennent à l'attaquant)
    const shootTypesOffensive = [
        'SHOOT_GOAL',
        'SHOOT_WOODWORK',
        'WOODWORK_OUT',
        'HEAD_SHOT',
        'FREE_KICK_SHOT',
        'PENALTY_GOAL',
        'CORNER_GOAL'
    ];
    // Types de tirs RATES/ARRETES (jetons défensifs - appartiennent au gardien/défense)
    const shootTypesDefensive = [
        'SHOOT_SAVED',
        'SHOOT_SAVED_CORNER',
        'SHOOT_OFF_TARGET',
        'PENALTY_SAVED',
        'PENALTY_MISS'
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

        // Sélectionne les bons jetons selon la possession
        const sysTokens: Partial<Token>[] = [];
        // Sélectionne les bons jetons selon la possession et l'équipe (home/away)
        if (possessionTeamId === homeId) {
            sysTokens.push(...(config.offenseTokensHome || []).map((t) => ({ ...t, _side: 'off' })));
            sysTokens.push(...(config.defenseTokensAway || []).map((t) => ({ ...t, _side: 'def' })));
        } else if (possessionTeamId === awayId) {
            sysTokens.push(...(config.offenseTokensAway || []).map((t) => ({ ...t, _side: 'off' })));
            sysTokens.push(...(config.defenseTokensHome || []).map((t) => ({ ...t, _side: 'def' })));
        }
        // fallback legacy
        if ((config as any).baseTokens) {
            sysTokens.push(...(config as any).baseTokens);
        }

        sysTokens.forEach((pt: Partial<Token> & { _side?: 'off' | 'def' }, index: number) => {
                if (!pt.type || pt.type === 'NEUTRAL_POSSESSION' || !validTypes.has(pt.type as string)) return;

                // On filtre selon la possession :
                // - offenseTokens* → teamId = possessionTeamId
                // - defenseTokens* → teamId = opponentTeamId
                const isOffensive = pt._side === 'off';
                const isDefensive = pt._side === 'def';
                const tokenTeamId = isOffensive ? possessionTeamId : isDefensive ? opponentTeamId : possessionTeamId;
                // Pour la logique existante, on ne traite que les jetons du bon côté
                if (isOffensive && pt.type === 'CROSS') {
                    // CROSS offensif : même logique qu'avant
                    const isOffensiveZoneHome = pos.x >= 3;
                    const isOffensiveZoneAway = pos.x <= 2;
                    let crossPossible = false;
                    if ((possessionTeamId === homeId && isOffensiveZoneHome && pos.x < 5) || 
                            (possessionTeamId === awayId && isOffensiveZoneAway && pos.x > 0)) {
                            crossPossible = true;
                    }
                    if (!crossPossible) return;
                }
                // On ne garde que les jetons offensifs pour l'équipe en possession, défensifs pour l'adversaire
                if ((isOffensive && tokenTeamId !== possessionTeamId) || (isDefensive && tokenTeamId !== opponentTeamId)) return;
        
        bag.push({
            id: `sys-${zoneKey}-${pt.type}-${index}`,
            type: pt.type as TokenType,
            ownerId: 0,
            teamId: tokenTeamId,
            quality: pt.quality || 30,
            duration: pt.duration || 5
        });
    });

        // 2. Jetons Joueurs filtrés par rôle autorisé dans la zone (comparaison en majuscules)
        // Récupérer le multiplicateur défensif de la zone
        // defenseMultiplier supprimé
        
        this.players.forEach(p => {
            const playerRole = typeof p.role === 'string' ? p.role.toUpperCase() : p.role;
            let allowedRoles: string[] = [];
            if (p.teamId === homeId) {
                allowedRoles = (config.allowedRolesHome || []).map((r: string) => r.toUpperCase());
            } else if (p.teamId === awayId) {
                allowedRoles = (config.allowedRolesAway || []).map((r: string) => r.toUpperCase());
            }
            if (!allowedRoles.includes(playerRole)) return;

            let weight = 0;
            const isSurfaceHome = ["0,1","0,2","0,3"].includes(zoneKey);
            const isSurfaceAway = ["5,1","5,2","5,3"].includes(zoneKey);
            const isAttacker = ["ST","MC","AML","AMR","LW","RW","AMC"].includes(playerRole);
            const isDefender = ["GK","DC","DL","DR"].includes(playerRole);

            // Cas spécial : surface adverse, on inclut les joueurs offensifs même si leur active/reach ne couvre pas la zone
            if (
                (isSurfaceHome && p.teamId === awayId && isAttacker) ||
                (isSurfaceAway && p.teamId === homeId && isAttacker)
            ) {
                weight = 1.0; // reach artificiel pour la surface adverse : on veut des tirs !
            } else if (
                // Défenseurs toujours présents dans leur propre surface
                (isSurfaceHome && p.teamId === homeId && isDefender) ||
                (isSurfaceAway && p.teamId === awayId && isDefender)
            ) {
                weight = 1.5; // Bonus pour les défenseurs dans leur surface
            } else if (p.activeZones.includes(zoneKey)) weight = 1.0;
            else if (p.reachZones.includes(zoneKey)) weight = 0.5;

            // Correction : seuls les défenseurs de l'équipe qui défend dans SA surface génèrent des jetons défensifs
            // Si on est dans la surface de AWAY (5,1/2/3), seuls les défenseurs de AWAY génèrent des jetons défensifs
            // Si on est dans la surface de HOME (0,1/2/3), seuls les défenseurs de HOME génèrent des jetons défensifs
            const isDefensiveSurface = (isSurfaceHome && p.teamId === homeId) || (isSurfaceAway && p.teamId === awayId);
            const hasBall = (p.teamId === possessionTeamId);
            if (weight > 0) {
                let pTokens: Token[] = [];
                if (hasBall) {
                    pTokens = p.getOffensiveTokens(weight, pos, homeId, awayId);
                } else {
                    // Si on est dans une surface défensive, seuls les défenseurs de l'équipe locale génèrent des jetons défensifs
                    if (isDefender && isDefensiveSurface) {
                        pTokens = p.getDefensiveTokens(weight);
                    } else if (!isSurfaceHome && !isSurfaceAway) {
                        // Hors surface, tous les défenseurs peuvent défendre normalement
                        pTokens = p.getDefensiveTokens(weight);
                    }
                }
                // defenseMultiplier supprimé
                pTokens.forEach(t => {
                    if (!t.type || !validTypes.has(t.type as string)) return;
                    t.ownerId = p.id;
                    t.teamId = p.teamId;
                    if (typeof t.teamId !== 'number') t.teamId = p.teamId;
                });
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

    // Limite stricte : max 100 jetons par sac, en conservant la proportion de chaque type
    const MAX_TOKENS = 100;
    if (bag.length > MAX_TOKENS) {
        // Regrouper par type
        const byType = new Map<string, Token[]>();
        for (const t of bag) {
            if (!byType.has(t.type)) byType.set(t.type, []);
            byType.get(t.type)!.push(t);
        }
        // Calculer la proportion de chaque type
        const total = bag.length;
        const typeCounts = Array.from(byType.entries()).map(([type, tokens]) => ({ type, count: tokens.length, tokens }));
        // Calculer le nombre de jetons à garder par type (arrondi, min 1 si présent)
        let kept = 0;
        const selected: Token[] = [];
        for (let i = 0; i < typeCounts.length; i++) {
            const { type, count, tokens } = typeCounts[i];
            // Dernier type : prend tout ce qui reste pour arriver à MAX_TOKENS
            let n = i === typeCounts.length - 1 ? (MAX_TOKENS - kept) : Math.max(1, Math.round(count / total * MAX_TOKENS));
            n = Math.min(n, tokens.length, MAX_TOKENS - kept);
            selected.push(...tokens.slice(0, n));
            kept += n;
            if (kept >= MAX_TOKENS) break;
        }
        bag = selected;
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
