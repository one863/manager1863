import type { BaseEntity } from "../common/types";

export interface League extends BaseEntity {
	name: string;
	level: number;
	reputation: number;
	promotionSpots: number;
	relegationSpots: number;
}
