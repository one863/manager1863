import { z } from "zod";
import { BaseEntitySchema } from "../common/schemas";

/**
 * Schémas Zod pour le domaine League
 */

export const LeagueSchema = BaseEntitySchema.extend({
	name: z.string().min(1).max(100),
	level: z.number().int().min(1).max(10),
	reputation: z.number().int().min(0).max(100),
	promotionSpots: z.number().int().min(0),
	relegationSpots: z.number().int().min(0),
});

export const CreateLeagueSchema = LeagueSchema.omit({ id: true });
export const UpdateLeagueSchema = LeagueSchema.partial();

export type LeagueInput = z.infer<typeof LeagueSchema>;
export type CreateLeagueInput = z.infer<typeof CreateLeagueSchema>;
export type UpdateLeagueInput = z.infer<typeof UpdateLeagueSchema>;
