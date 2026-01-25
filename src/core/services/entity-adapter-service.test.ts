import { describe, it, expect, beforeEach } from "vitest";
import { EntityService, DexieAdapter } from "./entity-adapter-service";
import type { Player } from "../ports/interfaces";

// Mock Dexie Table
class MockTable<T> {
  private data: T[] = [];
  private idCounter = 1;

  async put(entity: any) {
    if (!entity.id) entity.id = this.idCounter++;
    const idx = this.data.findIndex(e => e.id === entity.id);
    if (idx >= 0) this.data[idx] = entity;
    else this.data.push(entity);
    return entity.id;
  }
  async bulkPut(entities: any[]) {
    for (const e of entities) await this.put(e);
  }
  async get(id: number) {
    return this.data.find(e => e.id === id) || null;
  }
  async toArray() {
    return [...this.data];
  }
}

describe("EntityService + DexieAdapter", () => {
  let playerTable: MockTable<Player>;
  let playerAdapter: DexieAdapter<Player>;
  let playerService: EntityService<Player>;

  beforeEach(() => {
    playerTable = new MockTable<Player>();
    playerAdapter = new DexieAdapter<Player>(playerTable as any);
    playerService = new EntityService<Player>(playerAdapter, playerAdapter);
  });

  it("crée un joueur", async () => {
    const player = await playerService.createEntity({ firstName: "Zidane", lastName: "Zizou", teamId: 1, saveId: 1 } as any);
    expect(player.id).toBeDefined();
    expect(player.firstName).toBe("Zidane");
  });

  it("met à jour un joueur", async () => {
    const player = await playerService.createEntity({ firstName: "Zidane", lastName: "Zizou", teamId: 1, saveId: 1 } as any);
    const updated = await playerService.updateEntity(player.id!, { lastName: "Zizou2" });
    expect(updated.lastName).toBe("Zizou2");
  });

  it("récupère un joueur par id", async () => {
    const player = await playerService.createEntity({ firstName: "Zidane", lastName: "Zizou", teamId: 1, saveId: 1 } as any);
    const found = await playerService.getEntity(player.id!);
    expect(found).not.toBeNull();
    expect(found!.firstName).toBe("Zidane");
  });

  it("liste tous les joueurs", async () => {
    await playerService.createEntity({ firstName: "A", lastName: "A", teamId: 1, saveId: 1 } as any);
    await playerService.createEntity({ firstName: "B", lastName: "B", teamId: 2, saveId: 1 } as any);
    const all = await playerService.listEntities();
    expect(all.length).toBe(2);
  });

  it("filtre les joueurs par teamId", async () => {
    await playerService.createEntity({ firstName: "A", lastName: "A", teamId: 1, saveId: 1 } as any);
    await playerService.createEntity({ firstName: "B", lastName: "B", teamId: 2, saveId: 1 } as any);
    const filtered = await playerService.listEntities(p => p.teamId === 2);
    expect(filtered.length).toBe(1);
    expect(filtered[0].teamId).toBe(2);
  });
});
