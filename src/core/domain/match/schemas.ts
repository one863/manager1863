import { z } from "zod";
import { BaseEntitySchema } from "../common/schemas";

/**
 * Schémas Zod pour le domaine Match
 */

export const BallPositionSchema = z.object({
	x: z.number().min(0).max(100),
	y: z.number().min(0).max(100),
	team: z.enum(["HOME", "AWAY"]),
	timestamp: z.number().int().min(0),
});

export const MatchEventSchema = z.object({
	timestamp: z.number().int().min(0),
	type: z.string().min(1),
	team: z.enum(["HOME", "AWAY"]),
	playerId: z.number().int().optional(),
	x: z.number().optional(),
	y: z.number().optional(),
	description: z.string().min(1),
});

export const MatchStatsSchema = z.object({
	xg: z
		.object({
			home: z.number().min(0),
			away: z.number().min(0),
		})
		.optional(),
	possession: z
		.object({
			home: z.number().min(0).max(100),
			away: z.number().min(0).max(100),
		})
		.optional(),
	passes: z
		.object({
			home: z.number().int().min(0),
			away: z.number().int().min(0),
		})
		.optional(),
	duels: z
		.object({
			home: z.number().int().min(0),
			away: z.number().int().min(0),
		})
		.optional(),
	interceptions: z
		.object({
			home: z.number().int().min(0),
			away: z.number().int().min(0),
		})
		.optional(),
});

export const MatchResultSchema = z.object({
	matchId: z.number().int().positive(),
	homeTeamId: z.number().int().positive(),
	awayTeamId: z.number().int().positive(),
	homeScore: z.number().int().min(0),
	awayScore: z.number().int().min(0),
	events: z.array(MatchEventSchema),
	stats: MatchStatsSchema,
	ballHistory: z.array(BallPositionSchema),
	debugLogs: z.array(z.any()).optional(),
	stoppageTime: z.number().int().min(0).optional(),
});

export const MatchSchema = BaseEntitySchema.extend({
	leagueId: z.number().int().positive(),
	day: z.number().int().min(1),
	homeTeamId: z.number().int().positive(),
	awayTeamId: z.number().int().positive(),
	homeScore: z.number().int().min(0),
	awayScore: z.number().int().min(0),
	played: z.boolean(),
	pressure: z.number().min(0).max(100),
	stoppageTime: z.number().int().min(0).optional(),
	details: MatchResultSchema.optional(),
});

export const CreateMatchSchema = MatchSchema.omit({ id: true });
export const UpdateMatchSchema = MatchSchema.partial();

export type MatchInput = z.infer<typeof MatchSchema>;
export type MatchResultInput = z.infer<typeof MatchResultSchema>;
export type CreateMatchInput = z.infer<typeof CreateMatchSchema>;
export type UpdateMatchInput = z.infer<typeof UpdateMatchSchema>;
