import { z } from "zod";
import { BaseEntitySchema, TacticTypeSchema } from "../common/schemas";

/**
 * Schémas Zod pour le domaine Team
 */

export const TeamStatsSchema = z.object({
	matchesPlayed: z.number().int().min(0),
	wins: z.number().int().min(0),
	draws: z.number().int().min(0),
	losses: z.number().int().min(0),
	goalsFor: z.number().int().min(0),
	goalsAgainst: z.number().int().min(0),
	points: z.number().int().min(0),
});

export const TeamSchema = BaseEntitySchema.extend({
	leagueId: z.number().int().positive(),
	name: z.string().min(1).max(50),
	reputation: z.number().int().min(0).max(100),
	budget: z.number().int().min(0),
	primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i), // Format hex color
	secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i),
	stadiumName: z.string().min(1).max(100),
	stadiumCapacity: z.number().int().min(5000).max(200000),
	confidence: z.number().int().min(0).max(100),
	seasonGoal: z.string().max(200),
	fanCount: z.number().int().min(0),
	points: z.number().int().min(0),
	matchesPlayed: z.number().int().min(0),
	goalsFor: z.number().int().min(0),
	goalsAgainst: z.number().int().min(0),
	goalDifference: z.number().int(),
	wins: z.number().int().min(0),
	draws: z.number().int().min(0),
	losses: z.number().int().min(0),
	tacticType: z.string(),
	formation: z.string().regex(/^\d-\d-\d$/), // Format: "4-3-3"
	version: z.number().int().min(0),
});

export const CreateTeamSchema = TeamSchema.omit({ id: true });
export const UpdateTeamSchema = TeamSchema.partial();

export type TeamInput = z.infer<typeof TeamSchema>;
export type CreateTeamInput = z.infer<typeof CreateTeamSchema>;
export type UpdateTeamInput = z.infer<typeof UpdateTeamSchema>;
