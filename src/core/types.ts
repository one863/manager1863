import { z } from "zod";

/**
 * ⚠️ DEPRECATED: Importer depuis @/core/domain à la place
 * Ce fichier existe pour la rétro-compatibilité
 */
export type {
	TacticType,
	StrategyType,
	StaffRole,
	NewsCategory,
	PlayerPosition,
	PlayerSide,
	BaseEntity,
	Stats,
} from "./domain/common/types";

export type { Player, SeasonStats } from "./domain/player/types";
export type { Team, TeamStats } from "./domain/team/types";
export type { Match, MatchResult, MatchEvent, MatchStats, BallPosition } from "./domain/match/types";
export type { League } from "./domain/league/types";
export type { Staff } from "./domain/staff/types";
export type { NewsArticle } from "./domain/news/types";
export type { GameStateData } from "./domain/game/types";

// Schéma d'export/import de données complètes
export const ExportDataSchema = z.object({
	gameState: z.any(),
	teams: z.array(z.any()),
	players: z.array(z.any()),
	matches: z.array(z.any()),
	leagues: z.array(z.any()),
	news: z.array(z.any()),
	staff: z.array(z.any()).optional(),
	history: z.array(z.any()).optional(),
});

export type ExportData = z.infer<typeof ExportDataSchema>;
