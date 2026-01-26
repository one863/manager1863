import type { BaseEntity, TacticType } from "../common/types";

export interface Team extends BaseEntity {
	leagueId: number;
	name: string;
	reputation: number;
	budget: number;
	primaryColor: string;
	secondaryColor: string;
	stadiumName: string;
	stadiumCapacity: number;
	confidence: number;
	seasonGoal: string;
	fanCount: number;
	points: number;
	matchesPlayed: number;
	goalsFor: number;
	goalsAgainst: number;
	goalDifference: number;
	wins: number;
	draws: number;
	losses: number;
	tacticType: string;
	formation: string;
	version: number;

	// Propriétés additionnelles utilisées dans le code
	stadiumUpgradeEndDay?: number;
	stadiumProject?: { type: string; targetCapacity?: number; targetName?: string } | null;
	trainingFocus?: string;
	trainingEndDay?: number;
	trainingStartDay?: number;
	colors?: string[];
	sponsorName?: string;
	managerName?: string;
	sponsors?: any[];
	pendingIncome?: number;
	stadiumLevel?: number;
}

export interface TeamStats {
	matchesPlayed: number;
	wins: number;
	draws: number;
	losses: number;
	goalsFor: number;
	goalsAgainst: number;
	points: number;
}
