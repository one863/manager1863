
// Imports corrigés et types mockés pour compilation
// Remplacer par vos vrais modules et types
const ZONES_CONFIG: any = {};
const DEFAULT_ZONE_CONFIG: any = {};
const getFormationRoles = (formation: string) => [];
const isRoleActiveInZone = (role: string, pos: any, isHome: boolean) => false;
function getNarrativeTemplate(type: string) { return "{player} réalise une action."; }
function getStatCategory(type: string) { return "ACTION"; }

type MatchSituation = string;
type GridPosition = { x: number; y: number };
type Player = { id: number; name: string; role: string; skills: Record<string, number>; reachZones?: string[] };
import type { Token } from './types';

export class GridEngine {
  buildBag(
    pos: GridPosition,
    sit: MatchSituation,
    possessionTeamId: number,
    homeId: number,
    awayId: number,
    homeFormation: string,
    awayFormation: string,
    homePlayers: Player[],
    awayPlayers: Player[]
  ): Token[] {
    const zoneKey = `${pos.x},${pos.y}`;
    const zoneConfig = ZONES_CONFIG[zoneKey] || DEFAULT_ZONE_CONFIG;

    if (sit === 'KICK_OFF') {
      const formationRoles = possessionTeamId === homeId
        ? getFormationRoles(homeFormation)
        : getFormationRoles(awayFormation);
      return [
        {
          id: `${zoneKey}-kickoff-${possessionTeamId}-PASS_SHORT-0`,
          type: 'PASS_SHORT',
          teamId: possessionTeamId,
          zone: zoneKey,
          ownerId: 0,
          performerId: 0,
          playerName: 'Collectif',
          narrativeTemplate: '{player} effectue la passe courte.',
          statCategory: 'PASS',
        },
        {
          id: `${zoneKey}-kickoff-${possessionTeamId}-PASS_LATERAL-1`,
          type: 'PASS_LATERAL',
          teamId: possessionTeamId,
          zone: zoneKey,
          ownerId: 0,
          performerId: 0,
          playerName: 'Collectif',
          narrativeTemplate: '{player} effectue la passe latérale.',
          statCategory: 'PASS',
        }
      ];
    }

    if (sit === 'GOAL_KICK') {
      const formationRoles = possessionTeamId === homeId
        ? getFormationRoles(homeFormation)
        : getFormationRoles(awayFormation);
      const gkTokens = zoneConfig.GK_DISTRIBUTION || ['GK_SHORT', 'GK_LONG'];
      return gkTokens.map((tokenType: string, idx: number) => ({
        id: `${zoneKey}-goalkick-${possessionTeamId}-${tokenType}-${idx}`,
        type: tokenType,
        teamId: possessionTeamId,
        zone: zoneKey,
        ownerId: 0,
        performerId: 0,
        playerName: 'Gardien',
        narrativeTemplate: '{player} effectue une relance.',
        statCategory: 'GK',
      }));
    }

    // Situation normale
    let tokens: Token[] = [];
    const homeRoles = getFormationRoles(homeFormation);
    const awayRoles = getFormationRoles(awayFormation);
    // Helper pour influence
    function getInfluence(player: Player, actionType: string): number {
      // Exemple: Passe = player.skills.pass / 25 (80 → 3 jetons, 40 → 1 jeton)
      const skillMap: Record<string, keyof Player['skills']> = {
        'PASS_SHORT': 'pass',
        'PASS_LONG': 'pass',
        'PASS_LATERAL': 'pass',
        'SHOOT_GOAL': 'shoot',
        'TACKLE': 'defense',
      };
      const skillKey = skillMap[actionType] || 'pass';
      return Math.max(1, Math.floor((player.skills[skillKey] || 40) / 25));
    }
    function addPlayerTokens(players: Player[], tokenTypes: string[], teamId: number) {
      players.forEach(player => {
        // Vérifie si le joueur est actif ou en reach dans la zone
        if (isRoleActiveInZone(player.role, pos, teamId === homeId) || player.reachZones?.includes(zoneKey)) {
          tokenTypes.forEach(tokenType => {
            const influence = getInfluence(player, tokenType);
            for (let i = 0; i < influence; i++) {
              tokens.push({
                id: `${zoneKey}-${teamId}-${tokenType}-${player.id}-${i}`,
                type: tokenType,
                teamId,
                performerId: player.id,
                playerName: player.name,
                zone: zoneKey,
                narrativeTemplate: getNarrativeTemplate(tokenType),
                statCategory: getStatCategory(tokenType),
                ownerId: player.id,
              });
            }
          });
        }
      });
    }
    if (possessionTeamId === homeId) {
      addPlayerTokens(homePlayers, zoneConfig.offenseTokensHome, homeId);
      addPlayerTokens(awayPlayers, zoneConfig.defenseTokensAway, awayId);
    } else if (possessionTeamId === awayId) {
      addPlayerTokens(awayPlayers, zoneConfig.offenseTokensAway, awayId);
      addPlayerTokens(homePlayers, zoneConfig.defenseTokensHome, homeId);
    }
    return tokens;
  }
}

  // buildSituationBag retiré (hors classe, non utilisé)
