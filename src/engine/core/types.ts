import { z } from "zod";

// --- Constantes de Simulation ---
export const ENGINE_LIMITS = {
	MAX_SKILL: 10.99,
	MIN_SKILL: 1.0,
	MAX_MATCH_MINUTES: 120,
};

// --- Enums réutilisables ---
export const PlayerPositionSchema = z.enum(["GK", "DEF", "MID", "FWD"]);
export const PlayerSideSchema = z.enum(["L", "C", "R"]);
export const TacticTypeSchema = z.enum(["NORMAL", "CA", "PRESSING", "AIM", "AOW"]);
export const StrategyTypeSchema = z.enum(["DEFENSIVE", "BALANCED", "OFFENSIVE"]);
export const NewsTypeSchema = z.enum(["PRESS", "CLUB", "LEAGUE", "TRANSFER", "SPONSOR", "BOARD"]);
export const MatchEventTypeSchema = z.enum([
	"GOAL",
	"MISS",
	"SE",
	"CARD",
	"INJURY",
	"TRANSITION",
	"SET_PIECE",
	"SPECIAL",
]);

// --- Schémas de base ---

export const TeamRatingsSchema = z.object({
	midfield: z.number().min(ENGINE_LIMITS.MIN_SKILL).max(ENGINE_LIMITS.MAX_SKILL),
	attackLeft: z.number().min(ENGINE_LIMITS.MIN_SKILL).max(ENGINE_LIMITS.MAX_SKILL),
	attackCenter: z.number().min(ENGINE_LIMITS.MIN_SKILL).max(ENGINE_LIMITS.MAX_SKILL),
	attackRight: z.number().min(ENGINE_LIMITS.MIN_SKILL).max(ENGINE_LIMITS.MAX_SKILL),
	defenseLeft: z.number().min(ENGINE_LIMITS.MIN_SKILL).max(ENGINE_LIMITS.MAX_SKILL),
	defenseCenter: z.number().min(ENGINE_LIMITS.MIN_SKILL).max(ENGINE_LIMITS.MAX_SKILL),
	defenseRight: z.number().min(ENGINE_LIMITS.MIN_SKILL).max(ENGINE_LIMITS.MAX_SKILL),
	setPieces: z.number().min(ENGINE_LIMITS.MIN_SKILL).max(ENGINE_LIMITS.MAX_SKILL),
	tacticSkill: z.number().min(ENGINE_LIMITS.MIN_SKILL).max(ENGINE_LIMITS.MAX_SKILL),
	tacticType: TacticTypeSchema,
	strategy: StrategyTypeSchema,
});

export const MatchEventSchema = z.object({
	minute: z.number().int().min(0).max(ENGINE_LIMITS.MAX_MATCH_MINUTES),
	type: MatchEventTypeSchema,
	teamId: z.number(),
	scorerId: z.number().optional(),
	scorerName: z.string().optional(),
	description: z.string(),
});

export const MatchResultSchema = z.object({
	homeScore: z.number().int().min(0),
	awayScore: z.number().int().min(0),
	homePossession: z.number().min(0).max(100),
	events: z.array(MatchEventSchema),
	stats: z.object({
		homeChances: z.number().int(),
		awayChances: z.number().int(),
	}),
	playerPerformances: z.record(z.string(), z.number()).optional(), // playerId -> rating
});

// --- Schémas de la Base de Données (Persistance) ---

export const PlayerStatsSchema = z.object({
	stamina: z.number().min(1).max(ENGINE_LIMITS.MAX_SKILL),
	playmaking: z.number().min(1).max(ENGINE_LIMITS.MAX_SKILL),
	defense: z.number().min(1).max(ENGINE_LIMITS.MAX_SKILL),
	speed: z.number().min(1).max(ENGINE_LIMITS.MAX_SKILL),
	head: z.number().min(1).max(ENGINE_LIMITS.MAX_SKILL),
	technique: z.number().min(1).max(ENGINE_LIMITS.MAX_SKILL),
	scoring: z.number().min(1).max(ENGINE_LIMITS.MAX_SKILL),
	setPieces: z.number().min(1).max(ENGINE_LIMITS.MAX_SKILL),
	// Legacy
	strength: z.number().optional(),
	dribbling: z.number().optional(),
	passing: z.number().optional(),
	shooting: z.number().optional(),
});

export const PlayerSchema = z.object({
	id: z.number().optional(),
	saveId: z.number(),
	teamId: z.number(),
	firstName: z.string(),
	lastName: z.string(),
	age: z.number().int().min(14).max(50),
	position: PlayerPositionSchema,
	side: PlayerSideSchema.default("C"),
	dna: z.string(),
	skill: z.number().min(1).max(ENGINE_LIMITS.MAX_SKILL),
	stats: PlayerStatsSchema,
	form: z.number().min(1).max(8).default(5),
	formBackground: z.number().min(1).max(8).default(5),
	experience: z.number().min(1).max(10).default(1),
	energy: z.number().min(0).max(100),
	condition: z.number().min(0).max(100),
	morale: z.number().min(0).max(100),
	marketValue: z.number().nonnegative(),
	wage: z.number().nonnegative(),
	isStarter: z.boolean().optional(),
	lastTrainingSkillChange: z.number().optional(),
	playedThisWeek: z.boolean().default(false),
	lastRatings: z.array(z.number()).default([]),
});

export const SponsorSchema = z.object({
	name: z.string(),
	income: z.number().nonnegative(),
	expiryDay: z.number(),
	expirySeason: z.number(),
});

export const TeamSchema = z.object({
	id: z.number().optional(),
	saveId: z.number(),
	name: z.string(),
	leagueId: z.number(),
	managerName: z.string().optional(),
	presidentName: z.string().optional(),
	primaryColor: z.string().optional(),
	secondaryColor: z.string().optional(),
	matchesPlayed: z.number().int().default(0),
	points: z.number().int().default(0),
	goalsFor: z.number().int().default(0),
	goalsAgainst: z.number().int().default(0),
	goalDifference: z.number().int().default(0),
	budget: z.number(),
	pendingIncome: z.number().default(0),
	reputation: z.number().min(0).max(100),
	fanCount: z.number().int().nonnegative(),
	confidence: z.number().min(0).max(100),
	stadiumName: z.string(),
	stadiumCapacity: z.number().int().nonnegative(),
	stadiumLevel: z.number().int().min(1),
	sponsors: z.array(SponsorSchema).default([]),
	trainingFocus: z.enum(["GENERAL", "PHYSICAL", "ATTACK", "DEFENSE", "GK"]).optional(),
	seasonGoal: z.enum(["CHAMPION", "PROMOTION", "MID_TABLE", "AVOID_RELEGATION"]).optional(),
	seasonGoalStatus: z.enum(["PENDING", "SUCCESS", "FAILED"]).optional(),
	tacticType: TacticTypeSchema.default("NORMAL"),
	formation: z.enum(["4-4-2", "4-3-3", "3-5-2", "3-4-3", "4-2-4", "5-4-1", "2-3-5"]).default("4-4-2"),
	version: z.number(),
});

export const LeagueSchema = z.object({
	id: z.number().optional(),
	saveId: z.number(),
	name: z.string(),
	level: z.number(),
	relegationSpots: z.number(),
	promotionSpots: z.number(),
});

export const MatchSchema = z.object({
	id: z.number().optional(),
	saveId: z.number(),
	leagueId: z.number(),
	day: z.number().int(),
	homeTeamId: z.number(),
	awayTeamId: z.number(),
	homeScore: z.number().int(),
	awayScore: z.number().int(),
	date: z.coerce.date(),
	played: z.boolean(),
	details: MatchResultSchema.optional(),
});

export const NewsArticleSchema = z.object({
	id: z.number().optional(),
	saveId: z.number(),
	day: z.number().int(),
	date: z.coerce.date(),
	title: z.string(),
	content: z.string(),
	type: NewsTypeSchema,
	importance: z.number(),
	isRead: z.boolean(),
	actionData: z.any().optional(),
});

export const GameStateSchema = z.object({
	saveId: z.number(),
	currentDate: z.coerce.date(),
	userTeamId: z.number().nullable(),
	day: z.number().int().default(1),
	season: z.number().int().default(1),
	version: z.number(),
	hash: z.string().optional(),
	isGameOver: z.boolean().default(false),
	liveMatch: z.any().optional(),
});

export const ExportDataSchema = z.object({
	gameState: GameStateSchema,
	teams: z.array(TeamSchema),
	players: z.array(PlayerSchema),
	matches: z.array(MatchSchema),
	leagues: z.array(LeagueSchema),
	news: z.array(NewsArticleSchema),
	history: z.array(z.any()),
});

// --- Types dérivés (TypeScript) ---
export type PlayerPosition = z.infer<typeof PlayerPositionSchema>;
export type TacticType = z.infer<typeof TacticTypeSchema>;
export type StrategyType = z.infer<typeof StrategyTypeSchema>;
export type MatchEventType = z.infer<typeof MatchEventTypeSchema>;

export type Sponsor = z.infer<typeof SponsorSchema>;
export type TeamRatings = z.infer<typeof TeamRatingsSchema>;
export type MatchEvent = z.infer<typeof MatchEventSchema>;
export type MatchResult = z.infer<typeof MatchResultSchema>;
export type PlayerStats = z.infer<typeof PlayerStatsSchema>;
export type Player = z.infer<typeof PlayerSchema>;
export type Team = z.infer<typeof TeamSchema>;
export type League = z.infer<typeof LeagueSchema>;
export type Match = z.infer<typeof MatchSchema>;
export type NewsArticle = z.infer<typeof NewsArticleSchema>;
export type GameStateData = z.infer<typeof GameStateSchema>;
export type ExportData = z.infer<typeof ExportDataSchema>;
