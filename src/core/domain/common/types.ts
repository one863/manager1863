// Type minimal pour Sponsor (corrige l'import dans club-service)
export interface Sponsor {
	name: string;
	income: number;
	expiryDay: number;
	expirySeason: number;
}
/**
 * Types partagés entre tous les domaines
 */

export type TacticType = "NORMAL" | "POSSESSION" | "COUNTER" | "TRANSVERSAL" | "PARK_BUS" | "WING_PLAY";
export type StrategyType = "DEFENSIVE" | "BALANCED" | "OFFENSIVE";
export type StaffRole = "COACH" | "PHYSICAL_TRAINER" | "VIDEO_ANALYST";
export type NewsCategory = "MATCH" | "TRANSFER" | "CLUB" | "LEAGUE";
export type PlayerPosition = "GK" | "DEF" | "MID" | "FWD";
export type PlayerSide = "L" | "R" | "C";

/**
 * Attributs statistiques communs
 */
export interface Stats {
	technical: number;
	finishing: number;
	defense: number;
	physical: number;
	mental: number;
	goalkeeping: number;
}

/**
 * Entités avec identifiants et référence de sauvegarde
 */
export interface BaseEntity {
	id?: number;
	saveId: number;
}
