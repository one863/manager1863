import {
	type GameStateData,
	type League,
	type Match,
	MatchResult,
	type NewsArticle,
	type Player,
	type PlayerStats,
	type Team,
	TeamRatings,
} from "@/engine/core/types";
import Dexie, { type Table } from "dexie";

// We'export the types from engine/types to keep them in sync
export type {
	PlayerStats,
	Player,
	Team,
	League,
	Match,
	NewsArticle,
	GameStateData,
};

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
	teamId: number;
	name: string;
	role: "COACH" | "SCOUT" | "PHYSICAL_TRAINER";
	skill: number;
	stats: StaffStats;
	wage: number;
	age: number;
	dna: string;
	preferredStrategy: "DEFENSIVE" | "BALANCED" | "OFFENSIVE";
}

export interface SeasonHistory {
	id?: number;
	saveId: number;
	seasonYear: number;
	teamId: number;
	leagueName: string;
	position: number;
	points: number;
	achievements: string[];
}

export interface SaveSlot {
	id?: number;
	managerName: string;
	teamName: string;
	presidentName?: string;
	season: number;
	day: number;
	lastPlayedDate: Date;
}

export const CURRENT_DATA_VERSION = 1; 

class Manager1863DB extends Dexie {
	players!: Table<Player>;
	teams!: Table<Team>;
	leagues!: Table<League>;
	matches!: Table<Match>;
	saveSlots!: Table<SaveSlot>;
	gameState!: Table<GameStateData>;
	news!: Table<NewsArticle>;
	history!: Table<SeasonHistory>;
	staff!: Table<StaffMember>;

	constructor() {
		super("Manager1863_Storage_v2"); 

		this.version(1).stores({
			players: "++id, saveId, teamId, [saveId+teamId]",
			teams: "++id, saveId, leagueId, [saveId+leagueId]",
			leagues: "++id, saveId, level, [saveId+level]",
			matches: "++id, saveId, leagueId, day, [saveId+day]",
			saveSlots: "id, lastPlayedDate",
			gameState: "saveId",
			news: "++id, saveId, day, [saveId+day]",
			history: "++id, saveId, teamId, seasonYear",
			staff: "++id, saveId, teamId, [saveId+teamId]",
		});

		this.on("versionchange", () => {
			this.close();
			window.location.reload();
		});
	}
}

export const db = new Manager1863DB();

const SALT = "victoria-era-football-1863";
export async function computeSaveHash(saveId: number): Promise<string> {
	const state = await db.gameState.get(saveId);
	if (!state || !state.userTeamId) return "";
	const userTeam = await db.teams.get(state.userTeamId);
	if (!userTeam) return "";
	const dataToHash = JSON.stringify({
		saveId: state.saveId,
		day: state.day,
		season: state.season,
		teamId: state.userTeamId,
		points: userTeam.points || 0,
		budget: userTeam.budget,
		salt: SALT,
	});
	const msgUint8 = new TextEncoder().encode(dataToHash);
	const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifySaveIntegrity(saveId: number): Promise<boolean> {
	const state = await db.gameState.get(saveId);
	if (!state || !state.hash) return true;
	const currentHash = await computeSaveHash(saveId);
	return currentHash === state.hash;
}
