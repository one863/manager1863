import { db } from "@/core/db/db";
import type { Player } from "../ports/interfaces";
import type { SavePort, LoadPort } from "../ports/interfaces";

export class DexiePlayerAdapter implements SavePort<Player>, LoadPort<Player> {
  async save(player: Player): Promise<void> {
    await db.players.put(player as any);
  }
  async saveMany(players: Player[]): Promise<void> {
    await db.players.bulkPut(players as any);
  }
  async load(id: number): Promise<Player | null> {
    return (await db.players.get(id)) || null;
  }
  async loadAll(): Promise<Player[]> {
    return await db.players.toArray();
  }
}

// Exemple de service métier qui utilise les ports
export class PlayerService {
  constructor(
    private readonly savePort: SavePort<Player>,
    private readonly loadPort: LoadPort<Player>
  ) {}

  async createPlayer(input: Partial<Player>): Promise<Player> {
    // Ici, tu pourrais ajouter de la validation métier
    const player: Player = { ...input } as Player;
    await this.savePort.save(player);
    return player;
  }

  async updatePlayer(id: number, input: Partial<Player>): Promise<Player> {
    const existing = await this.loadPort.load(id);
    if (!existing) throw new Error("Player not found");
    const updated = { ...existing, ...input };
    await this.savePort.save(updated);
    return updated;
  }

  async getPlayer(id: number): Promise<Player | null> {
    return await this.loadPort.load(id);
  }

  async listPlayers(teamId?: number): Promise<Player[]> {
    const all = await this.loadPort.loadAll();
    return teamId ? all.filter(p => p.teamId === teamId) : all;
  }
}

// Utilisation :
// const playerAdapter = new DexiePlayerAdapter();
// const playerService = new PlayerService(playerAdapter, playerAdapter);
// await playerService.createPlayer({ ... });
