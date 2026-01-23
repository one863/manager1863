import { GridPosition, Token } from "./types";
import { TokenPlayer } from "./token-player";

export class GridEngine {
  private players: TokenPlayer[] = [];

  constructor(players: TokenPlayer[]) {
    this.players = players;
  }

  public getAllPlayers(): TokenPlayer[] {
      return this.players;
  }

  public getPlayer(id: number): TokenPlayer | undefined {
    return this.players.find(p => p.id === id);
  }

  private isAdjacent(pos1: GridPosition, pos2: GridPosition): boolean {
    const dx = Math.abs(pos1.x - pos2.x);
    const dy = Math.abs(pos1.y - pos2.y);
    return dx <= 1 && dy <= 1 && !(dx === 0 && dy === 0);
  }

  // CONSTRUIRE LE SAC POUR LA ZONE ACTUELLE
  public buildBagForZone(currentZone: GridPosition): Token[] {
    let bag: Token[] = [];
    let hasPlayersNearby = false;

    // 1. Essai Standard : Zone + Adjacents
    this.players.forEach(player => {
      if (player.position.x === currentZone.x && player.position.y === currentZone.y) {
        bag.push(...player.getTokensForBag(1.0));
        hasPlayersNearby = true;
      }
      else if (this.isAdjacent(player.position, currentZone)) {
        bag.push(...player.getTokensForBag(0.5));
        hasPlayersNearby = true;
      }
    });

    // 2. Mode Panique : Si personne n'est là, on va chercher les joueurs les plus proches (max 2)
    // pour éviter le blocage du match
    if (bag.length === 0) {
        // On trie les joueurs par distance
        const sorted = [...this.players].sort((a, b) => {
            const distA = Math.abs(a.position.x - currentZone.x) + Math.abs(a.position.y - currentZone.y);
            const distB = Math.abs(b.position.x - currentZone.x) + Math.abs(b.position.y - currentZone.y);
            return distA - distB;
        });

        // On prend les 2 plus proches et on force une injection faible (20%)
        const closest = sorted.slice(0, 2);
        closest.forEach(p => {
             bag.push(...p.getTokensForBag(0.2));
        });
    }

    // 3. Dernier Recours (Vraiment vide ?) -> Jeton système "Balle Perdue"
    if (bag.length === 0) {
        bag.push({
            id: 'sys-lost',
            type: 'ERROR',
            ownerId: 0,
            teamId: 0,
            quality: 0,
            duration: 5
        });
    }

    return this.shuffle(bag);
  }

  public movePlayersTowardsBall(ballPos: GridPosition, homeTeamId: number) {
     this.players.forEach(p => {
         const isHome = p.teamId === homeTeamId;
         const role = p.role || "MID"; 

         let idealX = ballPos.x;

         if (isHome) {
             if (role === "GK") idealX = 0; 
             else if (role.includes("DEF")) idealX = Math.min(ballPos.x - 1, 3);
             else if (role.includes("MID")) idealX = ballPos.x;
             else if (role.includes("ATT") || role === "ST") idealX = Math.min(ballPos.x + 1, 5); 
         } else {
             if (role === "GK") idealX = 5;
             else if (role.includes("DEF")) idealX = Math.max(ballPos.x + 1, 2); 
             else if (role.includes("MID")) idealX = ballPos.x; 
             else if (role.includes("ATT") || role === "ST") idealX = Math.max(ballPos.x - 1, 0); 
         }

         idealX = Math.max(0, Math.min(5, idealX));

         // Mouvement X
         if (p.position.x < idealX) p.position.x++;
         else if (p.position.x > idealX) p.position.x--;

         // Mouvement Y (Suivi latéral)
         const dy = Math.abs(p.position.y - ballPos.y);
         if (dy > 1) { // Plus réactif (avant c'était > 2)
             if (p.position.y < ballPos.y) p.position.y++;
             else p.position.y--;
         }
     });
  }

  private shuffle(array: Token[]): Token[] {
    let currentIndex = array.length, randomIndex;
    while (currentIndex !== 0) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
      [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
  }
}
