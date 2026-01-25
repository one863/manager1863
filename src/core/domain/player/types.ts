import type { BaseEntity, PlayerPosition, PlayerSide, Stats } from "../common/types";

export interface SeasonStats {
	matches: number;
	goals: number;
	assists: number;
	avgRating: number;
	xg: number;
	xa: number;
	distance: number;
	duelsWinRate: number;
	passAccuracy: number;
}

export interface Player extends BaseEntity {
	teamId: number;
	firstName: string;
	lastName: string;
	age: number;
	role: string;
	position: PlayerPosition;
	side: PlayerSide;
	skill: number;
	potential: number; // Max atteignable
	marketValue: number;
	wage: number;
	energy: number; // Forme actuelle
	morale: number; // Confiance actuelle
	condition: number; // Fraîcheur physique globale
	isStarter: boolean;
	stats: Stats;
	traits: string[];
	joinedDay: number;
	joinedSeason: number;
	dna: string;
	injuryDays: number;
	suspensionMatches: number;
	playedThisWeek: boolean;
	lastRatings: number[];
	seasonStats: SeasonStats;
}
