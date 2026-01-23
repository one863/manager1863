import { GridPosition, Token } from "./types";
import { TokenPlayer } from "./token-player";
import { ROLES_CONFIG } from "./config/roles-config";

export class GridEngine {
  private players: TokenPlayer[] = [];
  private homeTeamId: number;

  constructor(players: TokenPlayer[], homeTeamId: number, homeFormation: string, awayFormation: string) {
    this.players = players;
    this.homeTeamId = homeTeamId;
  }

  public getPlayer(id: number): TokenPlayer | undefined {
    return this.players.find(p => p.id === id);
  }

  /**
   * Construit le sac basé exclusivement sur la présence tactique des joueurs dans la zone.
   */
  public buildBagForZone(currentZone: GridPosition, possessionTeamId: number): Token[] {
    const bag: Token[] = [];
    const zoneKey = `${currentZone.x},${currentZone.y}`;

    // On parcourt tous les joueurs (Home et Away)
    this.players.forEach(player => {
      // Si la zone du ballon fait partie de l'influence tactique du rôle de ce joueur
      if (player.influenceZones.includes(zoneKey)) {
        // Le joueur fournit les jetons liés à son RÔLE TACTIQUE
        // (La qualité dépend de ses stats, mais le type/nombre dépend de sa position)
        bag.push(...player.getTokensForBag());
      }
    });

    // Sécurité : si personne n'est dans la zone (trou tactique)
    if (bag.length === 0) {
        bag.push({
            id: 'system-neutral',
            type: 'NEUTRAL_POSSESSION',
            ownerId: 0,
            teamId: 0,
            quality: 10,
            duration: 10
        });
    }

    return this.shuffle(bag);
  }

  private shuffle(array: Token[]): Token[] {
    let currentIndex = array.length;
    while (currentIndex !== 0) {
      const randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
      [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
  }
}
