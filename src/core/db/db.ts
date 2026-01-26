
import Dexie, { type Table } from "dexie";
import type { GameStateData, StaffRole } from "../types";
import type { League } from "../domain/league/types";
import type { Match, MatchResult } from "../domain/match/types";
import type { NewsArticle } from "../domain/news/types";
import type { Player } from "../domain/player/types";
import type { Team } from "../domain/team/types";

// Ré-exporte explicitement les types pour corriger les imports dans le projet
export type { League, Match, MatchResult, NewsArticle, Player, Team };

// Inscription de la nouvelle version pour supporter Condition, Moral et Potentiel persistants
// Version 21: Ajout table matchLogs séparée pour les logs de match temporaires
export const CURRENT_DATA_VERSION = 21; 

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
    data: string; 
}

// Logs de match temporaires (séparés de la sauvegarde principale)
export interface MatchLogsEntry {
    id?: number;
    saveId: number;
    matchId: number;
    debugLogs: any[];      // Logs complets avec bag, drawnToken, etc.
    events: any[];         // Événements formatés
    ballHistory: number[]; // Historique du ballon
}

export interface StaffStats {
	coaching: number;
	medical: number;
	management: number;
	tactical: number;
	discipline: number;
	conditioning: number;
	recovery: number;
	reading: number;
	training: number;
	physical?: number;
	goalkeeping?: number;
}

export interface StaffMember {
	id?: number;
	saveId: number;
	teamId?: number;
	firstName: string;
	lastName: string;
	role: StaffRole;
	skill: number;
	wage: number;
	age: number;
	dna: string;
	stats: StaffStats;
	confidence: number;
	joinedDay: number;
	joinedSeason: number;
	traits?: string[];
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
    matchLogs!: Table<MatchLogsEntry>;

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
            backups: "++id, saveId, timestamp, [saveId+timestamp]",
            matchLogs: "++id, saveId, matchId, [saveId+matchId]"
		});
	}
}

export const db = new AppDatabase();

export async function persistStorage() {
  if (navigator.storage && navigator.storage.persist) {
    const isPersisted = await navigator.storage.persisted();
    if (!isPersisted) {
      await navigator.storage.persist();
    }
  }
}

export async function clearAllData() {
    await db.transaction("rw", db.tables, async () => {
        await Promise.all(db.tables.map(table => table.clear()));
    });
}

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
