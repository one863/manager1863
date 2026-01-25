/**
 * Export centralisé de tous les types et schemas de domaine
 * Permet les imports simples: 
 *   - Types: import { Player, Team } from "@/core/domain"
 *   - Schemas: import { PlayerSchema, TeamSchema } from "@/core/domain/schemas"
 */

// ========== TYPES ==========

// Common
export type {
	TacticType,
	StrategyType,
	StaffRole,
	NewsCategory,
	PlayerPosition,
	PlayerSide,
	Stats,
	BaseEntity,
} from "./common/types";

// Domaines
export type { Player, SeasonStats } from "./player/types";
export type { Team, TeamStats } from "./team/types";
export type { Match, MatchResult, MatchEvent, MatchStats, BallPosition } from "./match/types";
export type { League } from "./league/types";
export type { Staff } from "./staff/types";
export type { NewsArticle } from "./news/types";
export type { GameStateData } from "./game/types";

// ========== SCHEMAS ==========

// Common schemas
export {
	TacticTypeSchema,
	StrategyTypeSchema,
	StaffRoleSchema,
	NewsCategorySchema,
	PlayerPositionSchema,
	PlayerSideSchema,
	StatsSchema,
	BaseEntitySchema,
} from "./common/schemas";

// Player schemas
export {
	PlayerSchema,
	SeasonStatsSchema,
	CreatePlayerSchema,
	UpdatePlayerSchema,
	type PlayerInput,
	type CreatePlayerInput,
	type UpdatePlayerInput,
} from "./player/schemas";

// Team schemas
export {
	TeamSchema,
	TeamStatsSchema,
	CreateTeamSchema,
	UpdateTeamSchema,
	type TeamInput,
	type CreateTeamInput,
	type UpdateTeamInput,
} from "./team/schemas";

// Match schemas
export {
	MatchSchema,
	MatchResultSchema,
	MatchEventSchema,
	MatchStatsSchema,
	BallPositionSchema,
	CreateMatchSchema,
	UpdateMatchSchema,
	type MatchInput,
	type MatchResultInput,
	type CreateMatchInput,
	type UpdateMatchInput,
} from "./match/schemas";

// League schemas
export {
	LeagueSchema,
	CreateLeagueSchema,
	UpdateLeagueSchema,
	type LeagueInput,
	type CreateLeagueInput,
	type UpdateLeagueInput,
} from "./league/schemas";

// Staff schemas
export {
	StaffSchema,
	CreateStaffSchema,
	UpdateStaffSchema,
	type StaffInput,
	type CreateStaffInput,
	type UpdateStaffInput,
} from "./staff/schemas";

// News schemas
export {
	NewsArticleSchema,
	CreateNewsArticleSchema,
	UpdateNewsArticleSchema,
	type NewsArticleInput,
	type CreateNewsArticleInput,
	type UpdateNewsArticleInput,
} from "./news/schemas";

// Game schemas
export {
	GameStateDataSchema,
	CreateGameStateDataSchema,
	UpdateGameStateDataSchema,
	type GameStateDataInput,
	type CreateGameStateDataInput,
	type UpdateGameStateDataInput,
} from "./game/schemas";
