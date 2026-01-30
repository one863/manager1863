
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
export const CURRENT_DATA_VERSION = 30; 

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
	ballHistory: { x: number; y: number }[]; // Historique du ballon
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

		const dbName = "Manager1863DB";

		// Patch auto : suppression si version incompatible (dev uniquement)
		if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
			// Patch auto désactivé : suppression manuelle recommandée lors d'un changement de schéma.
		}

		const stores = {
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
		};
		this.version(CURRENT_DATA_VERSION).stores(stores);
	}
}

export const db = new AppDatabase();

// Test d'accès réel à la base et à la table players
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
	(async () => {
		try {
			const testPlayer = {
				id: 999999,
				saveId: -1,
				teamId: -1,
				firstName: "Test",
				lastName: "Player",
				role: "TEST",
				skill: 0,
				wage: 0,
				age: 0,
				dna: "",
				position: "MID",
				side: "C",
				potential: 0,
				marketValue: 0,
				energy: 0,
				morale: 0,
				condition: 0,
				isStarter: false,
				stats: {
					technical: 0,
					finishing: 0,
					defense: 0,
					physical: 0,
					mental: 0,
					goalkeeping: 0
				},
				traits: [],
				joinedDay: 0,
				joinedSeason: 0,
				injuryDays: 0,
				suspensionMatches: 0,
				playedThisWeek: false,
				lastRatings: [],
				seasonStats: {
					matches: 0,
					goals: 0,
					assists: 0,
					avgRating: 0,
					xg: 0,
					xa: 0,
					distance: 0,
					duelsWinRate: 0,
					passAccuracy: 0
				},
				form: 0,
				formBackground: 0
			};
			await db.players.put(testPlayer);
			const found = await db.players.get(999999);
			if (found) {
				await db.players.delete(999999);
			}
		} catch (err) {
			// Suppression des logs de test
		}
	})();
}

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
