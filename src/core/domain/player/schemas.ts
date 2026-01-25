import { z } from "zod";
import { BaseEntitySchema, StatsSchema } from "../common/schemas";

/**
 * Schémas Zod pour le domaine Player
 */

export const SeasonStatsSchema = z.object({
	matches: z.number().int().min(0),
	goals: z.number().int().min(0),
	assists: z.number().int().min(0),
	avgRating: z.number().min(0).max(20),
	xg: z.number().min(0),
	xa: z.number().min(0),
	distance: z.number().min(0),
	duelsWinRate: z.number().min(0).max(100),
	passAccuracy: z.number().min(0).max(100),
});

// ...

// Schéma de base sans refinements
const PlayerBaseSchema = BaseEntitySchema.extend({
	teamId: z.number().int().positive(),
	firstName: z.string().min(1).max(50),
	lastName: z.string().min(1).max(50),
	age: z.number().int().min(16).max(45),
	role: z.string().min(1),
	position: z.enum(["GK", "DEF", "MID", "FWD"]),
	side: z.enum(["L", "R", "C"]),
	skill: z.number().int().min(0).max(20),
	potential: z.number().int().min(0).max(20),
	marketValue: z.number().int().min(0),
	wage: z.number().int().min(0),
	energy: z.number().int().min(0).max(100),
	morale: z.number().int().min(0).max(100),
	condition: z.number().int().min(0).max(100),
	isStarter: z.boolean(),
	stats: StatsSchema,
	traits: z.array(z.string()),
	joinedDay: z.number().int().min(0),
	joinedSeason: z.number().int().min(0),
	dna: z.string().regex(/^\d+(-\d+)*$/), // Format: "1-4-2-1-0"
	injuryDays: z.number().int().min(0),
	suspensionMatches: z.number().int().min(0),
	playedThisWeek: z.boolean(),
	lastRatings: z.array(z.number().min(0).max(20)),
	seasonStats: SeasonStatsSchema,
});

// Schéma complet avec refinements
export const PlayerSchema = PlayerBaseSchema
	.refine((p) => p.skill <= p.potential, {
		message: "Le skill ne peut pas dépasser le potential du joueur.",
		path: ["skill"],
	})
	.refine((p) => p.age >= 16 && p.age <= 45, {
		message: "L'âge du joueur doit être entre 16 et 45 ans.",
		path: ["age"],
	})
	.refine((p) => /^\d+(-\d+)*$/.test(p.dna), {
		message: "Le format du DNA est invalide.",
		path: ["dna"],
	})
	.refine((p) => p.wage >= 0, {
		message: "Le salaire doit être positif.",
		path: ["wage"],
	});

// Schéma pour création (sans id, sans refinements globaux)
export const CreatePlayerSchema = PlayerBaseSchema.omit({ id: true });
export const UpdatePlayerSchema = PlayerBaseSchema.partial();

export type PlayerInput = z.infer<typeof PlayerSchema>;
export type CreatePlayerInput = z.infer<typeof CreatePlayerSchema>;
export type UpdatePlayerInput = z.infer<typeof UpdatePlayerSchema>;
