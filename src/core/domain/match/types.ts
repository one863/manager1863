import type { BaseEntity } from "../common/types";

export interface Match extends BaseEntity {
	leagueId: number;
	day: number;
	homeTeamId: number;
	awayTeamId: number;
	homeScore: number;
	awayScore: number;
	played: boolean;
	pressure: number;
	stoppageTime?: number;
	details?: MatchResult;
}

export interface MatchResult {
	matchId: number;
	homeTeamId: number;
	awayTeamId: number;
	homeScore: number;
	awayScore: number;
	events: MatchEvent[];
	stats: MatchStats;
	ballHistory: BallPosition[];
	debugLogs?: any[];
	stoppageTime?: number;
}

export interface MatchEvent {
	timestamp: number;
	type: string;
	team: "HOME" | "AWAY";
	playerId?: number;
	x?: number;
	y?: number;
	description: string;
}

export interface MatchStats {
	xg?: { home: number; away: number };
	possession?: { home: number; away: number };
	passes?: { home: number; away: number };
	duels?: { home: number; away: number };
	interceptions?: { home: number; away: number };
	[key: string]: any;
}

export interface BallPosition {
	x: number;
	y: number;
	team: "HOME" | "AWAY";
	timestamp: number;
}
