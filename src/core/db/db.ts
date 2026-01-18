import Dexie, { type Table } from "dexie";
import type { 
	GameStateData, 
	League, 
	Match, 
	NewsArticle, 
	Player, 
	Team, 
	Sponsor,
	PlayerStats,
	MatchResult,
	SeasonStats,
	PlayerTrait,
    StaffTrait
} from "../engine/core/types";

export const CURRENT_DATA_VERSION = 15; 

export interface SaveSlot {
	id?: number;
	managerName: string;
	teamName: string;
	lastPlayedDate: Date;
	day: number;
	season: number;
}

export interface BackupSlot {
    id?: number;
    saveId: number;
    timestamp: number;
    data: string; // JSON string of the backup
}

export interface StaffStats {
	management: number;
	training: number;
	tactical: number;
	physical: number;
	goalkeeping: number;
}

export interface StaffMember {
	id?: number;
	saveId: number;
	teamId?: number;
	firstName: string;
	lastName: string;
	role: "COACH" | "SCOUT" | "PHYSICAL_TRAINER";
	skill: number;
	wage: number;
	age: number;
	dna: string;
	preferredStrategy?: "DEFENSIVE" | "BALANCED" | "OFFENSIVE";
	stats: StaffStats;
	confidence: number;
    traits: StaffTrait[];
    joinedDay: number;
    joinedSeason: number;
}

export class AppDatabase extends Dexie {
	saveSlots!: Table<SaveSlot>;
	gameState!: Table<GameStateData & { id?: number }>;
	leagues!: Table<League>;
	teams!: Table<Team>;
	players!: Table<Player>;
	matches!: Table<Match>;
	news!: Table<NewsArticle>;
	staff!: Table<StaffMember>;
	history!: Table<any>;
    backups!: Table<BackupSlot>;

	constructor() {
		super("Manager1863DB");
		
		this.version(CURRENT_DATA_VERSION).stores({
			saveSlots: "++id, lastPlayedDate", 
			gameState: "++id, saveId", 
			leagues: "++id, saveId",
			teams: "++id, saveId, leagueId",
			players: "++id, saveId, teamId, isStarter, [saveId+teamId]",
			matches: "++id, saveId, leagueId, day, played, [saveId+day]",
			news: "++id, saveId, day, [saveId+day]",
			staff: "++id, saveId, teamId, [saveId+teamId]",
			history: "++id, saveId, teamId",
            backups: "++id, saveId, timestamp, [saveId+timestamp]"
		});
	}
}

export const db = new AppDatabase();

/**
 * Persist storage to prevent browser from deleting it
 */
export async function persistStorage() {
  if (navigator.storage && navigator.storage.persist) {
    const isPersisted = await navigator.storage.persisted();
    console.log(`Storage persisted: ${isPersisted}`);
    if (!isPersisted) {
      const persisted = await navigator.storage.persist();
      console.log(`Storage persisted after request: ${persisted}`);
    }
  }
}

export type { 
	Player, 
	Team, 
	Match, 
	League, 
	NewsArticle, 
	Sponsor, 
	PlayerStats, 
	MatchResult,
	SeasonStats,
	PlayerTrait
};

export async function verifySaveIntegrity(saveId: number): Promise<boolean> {
	try {
		const state = await db.gameState.where("saveId").equals(saveId).first();
		return !!state;
	} catch (e) {
		return false;
	}
}

export async function computeSaveHash(saveId: number): Promise<string> {
	return "STABLE_HASH_" + saveId;
}
