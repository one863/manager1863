import type { BaseEntity } from "../common/types";

export interface GameStateData extends BaseEntity {
	currentDate: Date;
	day: number;
	season: number;
	userTeamId: number;
	liveMatch: any;
	isGameOver?: boolean;
}
