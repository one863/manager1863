import { z } from "zod";
import { BaseEntitySchema } from "../common/schemas";

/**
 * Schémas Zod pour le domaine Game
 */

export const GameStateDataSchema = BaseEntitySchema.extend({
	currentDate: z.coerce.date(),
	day: z.number().int().min(1),
	season: z.number().int().min(1),
	userTeamId: z.number().int().positive(),
	liveMatch: z.any().optional(),
	isGameOver: z.boolean().optional(),
});

export const CreateGameStateDataSchema = GameStateDataSchema.omit({ id: true });
export const UpdateGameStateDataSchema = GameStateDataSchema.partial();

export type GameStateDataInput = z.infer<typeof GameStateDataSchema>;
export type CreateGameStateDataInput = z.infer<typeof CreateGameStateDataSchema>;
export type UpdateGameStateDataInput = z.infer<typeof UpdateGameStateDataSchema>;
