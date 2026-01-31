import { z } from "zod";

/**
 * Schémas Zod partagés utilisés dans tous les domaines
 */

export const TacticTypeSchema = z.enum([
	"NORMAL",
	"POSSESSION",
	"COUNTER",
	"TRANSVERSAL",
	"PARK_BUS",
	"WING_PLAY",
]);

export const StrategyTypeSchema = z.enum(["DEFENSIVE", "BALANCED", "OFFENSIVE"]);

export const StaffRoleSchema = z.enum(["COACH", "PHYSICAL_TRAINER", "VIDEO_ANALYST"]);

export const NewsCategorySchema = z.enum(["MATCH", "TRANSFER", "CLUB", "LEAGUE"]);

export const PlayerPositionSchema = z.enum(["GK", "DEF", "MID", "FWD"]);

export const PlayerSideSchema = z.enum(["L", "R", "C"]);

/**
 * Schéma pour les attributs statistiques
 */
export const StatsSchema = z.object({
	technical: z.number().int().min(0).max(20),
	finishing: z.number().int().min(0).max(20),
	defense: z.number().int().min(0).max(20),
	physical: z.number().int().min(0).max(20),
	mental: z.number().int().min(0).max(20),
	goalkeeping: z.number().int().min(0).max(20),
});

/**
 * Schéma de base pour les entités
 */
export const BaseEntitySchema = z.object({
	id: z.number().int().optional(),
	saveId: z.number().int().positive(),
});
