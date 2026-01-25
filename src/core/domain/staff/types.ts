import type { BaseEntity, StaffRole, Stats } from "../common/types";

export interface Staff extends BaseEntity {
	teamId?: number;
	firstName: string;
	lastName: string;
	role: StaffRole;
	dna: string;
	stats: Stats;
	wage: number;
	age: number;
	joinedDay: number;
	joinedSeason: number;
}
