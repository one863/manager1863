import { z } from "zod";

// --- Schémas de base ---

export const TeamRatingsSchema = z.object({
	midfield: z.number().min(1).max(10.99),
	attackLeft: z.number().min(1).max(10.99),
	attackCenter: z.number().min(1).max(10.99),
	attackRight: z.number().min(1).max(10.99),
	defenseLeft: z.number().min(1).max(10.99),
	defenseCenter: z.number().min(1).max(10.99),
	defenseRight: z.number().min(1).max(10.99),
	setPieces: z.number().min(1).max(10.99),
	tacticSkill: z.number().min(1).max(10.99),
	tacticType: z.enum(["NORMAL", "CA", "PRESSING", "AIM", "AOW"]),
	strategy: z.enum(["DEFENSIVE", "BALANCED", "OFFENSIVE"]),
});

export const MatchEventSchema = z.object({
	minute: z.number().int().min(0).max(120),
	type: z.enum([
		"GOAL",
		"MISS",
		"SE",
		"CARD",
		"INJURY",
		"TRANSITION",
		"SET_PIECE",
		"SPECIAL",
	]),
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
	stamina: z.number().min(1).max(10.99),
	playmaking: z.number().min(1).max(10.99),
	defense: z.number().min(1).max(10.99),
	speed: z.number().min(1).max(10.99),
	head: z.number().min(1).max(10.99),
	technique: z.number().min(1).max(10.99),
	scoring: z.number().min(1).max(10.99),
	setPieces: z.number().min(1).max(10.99),
	// Legacy fields still used in some places
	strength: z.number().min(1).max(10.99).optional(),
	dribbling: z.number().min(1).max(10.99).optional(),
	passing: z.number().min(1).max(10.99).optional(),
	shooting: z.number().min(1).max(10.99).optional(),
});

export const PlayerSchema = z.object({
	id: z.number().optional(),
	saveId: z.number(),
	teamId: z.number(),
	firstName: z.string(),
	lastName: z.string(),
	age: z.number().int().min(14).max(50),
	position: z.enum(["GK", "DEF", "MID", "FWD"]),
	side: z.enum(["L", "C", "R"]).default("C"),
	dna: z.string(),
	skill: z.number().min(1).max(10.99),
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
	// Nouveaux champs pour sponsors multiples
	sponsors: z.array(SponsorSchema).default([]),
	// Legacy fields (kept for migration/compatibility)
	sponsorName: z.string().optional(),
	sponsorIncome: z.number().nonnegative().optional(),
	sponsorExpiryDate: z.coerce.date().optional(),
	sponsorExpiryDay: z.number().optional(),
	sponsorExpirySeason: z.number().optional(),
	
	stadiumUpgradeEndDay: z.number().optional(),
	stadiumProject: z.any().optional(),
	trainingEndDay: z.number().optional(),
	trainingStartDay: z.number().optional(),
	trainingFocus: z.enum(["GENERAL", "PHYSICAL", "ATTACK", "DEFENSE", "GK"]).optional(), // MODIFIÉ
	seasonGoal: z
		.enum(["CHAMPION", "PROMOTION", "MID_TABLE", "AVOID_RELEGATION"])
		.optional(),
	seasonGoalStatus: z.enum(["PENDING", "SUCCESS", "FAILED"]).optional(),
	tacticType: z
		.enum(["NORMAL", "CA", "PRESSING", "AIM", "AOW"])
		.default("NORMAL"),
	formation: z
		.enum(["4-4-2", "4-3-3", "3-5-2", "3-4-3", "4-2-4", "5-4-1", "2-3-5"])
		.default("4-4-2"),
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
	type: z.enum(["PRESS", "CLUB", "LEAGUE", "TRANSFER", "SPONSOR", "BOARD"]),
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
