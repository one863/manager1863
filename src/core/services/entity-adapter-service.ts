import { db } from "@/core/db/db";
import type { Player, Team } from "../ports/interfaces";
import type { SavePort, LoadPort } from "../ports/interfaces";
import type { Table } from "dexie";

// --- Adapter générique Dexie ---
export class DexieAdapter<T> implements SavePort<T>, LoadPort<T> {
  constructor(private readonly table: Table<T, number>) {}

  async save(entity: T): Promise<void> {
    await this.table.put(entity);
  }
  async saveMany(entities: T[]): Promise<void> {
    await this.table.bulkPut(entities);
  }
  async load(id: number): Promise<T | null> {
    return (await this.table.get(id)) || null;
  }
  async loadAll(): Promise<T[]> {
    return await this.table.toArray();
  }
}

// --- Services métiers génériques ---
export class EntityService<T> {
  constructor(
    private readonly savePort: SavePort<T>,
    private readonly loadPort: LoadPort<T>
  ) {}

  async createEntity(input: Partial<T>): Promise<T> {
    const entity: T = { ...input } as T;
    await this.savePort.save(entity);
    return entity;
  }

  async updateEntity(id: number, input: Partial<T>): Promise<T> {
    const existing = await this.loadPort.load(id);
    if (!existing) throw new Error("Entity not found");
    const updated = { ...existing, ...input };
    await this.savePort.save(updated);
    return updated;
  }

  async getEntity(id: number): Promise<T | null> {
    return await this.loadPort.load(id);
  }

  async listEntities(filterFn?: (e: T) => boolean): Promise<T[]> {
    const all = await this.loadPort.loadAll();
    return filterFn ? all.filter(filterFn) : all;
  }
}

// --- Exemples d'utilisation ---
// const playerAdapter = new DexieAdapter<Player>(db.players);
// const playerService = new EntityService<Player>(playerAdapter, playerAdapter);
// const teamAdapter = new DexieAdapter<Team>(db.teams);
// const teamService = new EntityService<Team>(teamAdapter, teamAdapter);
