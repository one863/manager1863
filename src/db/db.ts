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
	SeasonStats
} from "./engine/core/types";

export const CURRENT_DATA_VERSION = 9; 

export interface SaveSlot {
	id?: number;
	name: string;
	lastPlayedDate: Date;
	day: number;
	season: number;
}

export interface StaffMember {
	id?: number;
	saveId: number;
	teamId: number;
	name: string;
	role: "COACH" | "SCOUT" | "DIRECTOR";
	skill: number;
	wage: number;
	age: number;
	dna: string;
	preferredStrategy?: "DEFENSIVE" | "BALANCED" | "OFFENSIVE";
	stats: {
		management: number;
		training: number;
		tactical: number;
		physical: number;
		goalkeeping: number;
		strategy: number;
	};
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
		});
	}
}

export const db = new AppDatabase();

export type { 
	Player, 
	Team, 
	Match, 
	League, 
	NewsArticle, 
	Sponsor, 
	PlayerStats, 
	MatchResult,
	SeasonStats 
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
