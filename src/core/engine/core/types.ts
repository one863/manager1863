import { z } from "zod";

// --- Constantes de Simulation ---
export const ENGINE_LIMITS = {
	MAX_SKILL: 20.99, // Notation sur 20
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
	"SHOT",
]);

export const PlayerTraitSchema = z.enum([
	"COUNTER_ATTACKER",
	"SHORT_PASSER",
	"CLUTCH_FINISHER",
	"WING_WIZARD",
	"IRON_DEFENDER",
	"MARATHON_MAN",
	"BOX_TO_BOX",
	"FREE_KICK_EXPERT",
	"SWEEPER_GK",
	"BIG_MATCH_PLAYER",
	"GHOST_PLAYER",
]);

export const StaffTraitSchema = z.enum([
    "MOTIVATOR",
    "TACTICIAN",
    "YOUTH_SPECIALIST",
    "STRATEGIST",
    "HARD_DRILLER", // Boost physique mais fatigue plus les joueurs
]);

// --- Schémas de base ---

export const TeamRatingsSchema = z.object({
	// Volume & Control
	midfield: z.number(),      // Global control/possession
	pressing: z.number(),      // Team PPDA capacity
	resistance: z.number(),    // Team OPPDA capacity
	
	// Offensive
	attackLeft: z.number(),
	attackCenter: z.number(),
	attackRight: z.number(),
	
	// Defensive
	defenseLeft: z.number(),
	defenseCenter: z.number(),
	defenseRight: z.number(),
	
	setPieces: z.number(),
	tacticSkill: z.number(),
	tacticType: TacticTypeSchema,
	strategy: StrategyTypeSchema,
	pressure: z.number().default(0),
});

export const PlayerMatchStatsSchema = z.object({
	rating: z.number(),
	goals: z.number().default(0),
	assists: z.number().default(0),
	shots: z.number().default(0),
	shotsOnTarget: z.number().default(0),
	xg: z.number().default(0),
	xa: z.number().default(0),
	passes: z.number().default(0),
	passesSuccess: z.number().default(0),
	duels: z.number().default(0),
	duelsWon: z.number().default(0),
	distance: z.number().default(0),
	sprints: z.number().default(0),
	interventions: z.number().default(0),
	saves: z.number().default(0),
});

export const SeasonStatsSchema = z.object({
	matches: z.number().default(0),
	goals: z.number().default(0),
	assists: z.number().default(0),
	avgRating: z.number().default(0),
	xg: z.number().default(0),
	xa: z.number().default(0),
	distance: z.number().default(0),
	duelsWinRate: z.number().default(0),
	passAccuracy: z.number().default(0),
});

export const MatchEventSchema = z.object({
	minute: z.number().int().min(0).max(ENGINE_LIMITS.MAX_MATCH_MINUTES),
	type: MatchEventTypeSchema,
	teamId: z.number(),
	scorerId: z.number().optional(),
	scorerName: z.string().optional(),
	description: z.string(),
	playerId: z.number().optional(), 
	duration: z.number().optional(),
	xg: z.number().optional(), 
});

export const MatchResultSchema = z.object({
	homeScore: z.number().int().min(0),
	awayScore: z.number().int().min(0),
	homePossession: z.number().min(0).max(100),
	events: z.array(MatchEventSchema),
	stats: z.object({
		homeChances: z.number().int(),
		awayChances: z.number().int(),
		homeShots: z.number().int().default(0),
		awayShots: z.number().int().default(0),
		homeShotsOnTarget: z.number().int().default(0),
		awayShotsOnTarget: z.number().int().default(0),
		homeXG: z.number().default(0), 
		awayXG: z.number().default(0),
		homeXA: z.number().default(0),
		awayXA: z.number().default(0),
		homePPDA: z.number().default(0),
		awayPPDA: z.number().default(0),
		homePasses: z.number().default(0),
		awayPasses: z.number().default(0),
		homeDefensiveActions: z.number().default(0),
		awayDefensiveActions: z.number().default(0),
		homeDuelsWon: z.number().default(0),
		awayDuelsWon: z.number().default(0),
		homeDuelsTotal: z.number().default(0),
		awayDuelsTotal: z.number().default(0),
		homeDistance: z.number().default(0),
		awayDistance: z.number().default(0),
	}),
	playerPerformances: z.record(z.string(), z.number()).optional(), 
	playerStats: z.record(z.string(), PlayerMatchStatsSchema).optional(),
});

// --- Schémas de la Base de Données (Persistance) ---

export const PlayerStatsSchema = z.object({
	finishing: z.number().min(1).max(20),
	creation: z.number().min(1).max(20),
	vision: z.number().min(1).max(20),
	pressing: z.number().min(1).max(20),
	intervention: z.number().min(1).max(20),
	impact: z.number().min(1).max(20),
	resistance: z.number().min(1).max(20),
	volume: z.number().min(1).max(20),
	explosivity: z.number().min(1).max(20),
	goalkeeping: z.number().min(1).max(20).optional(),
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
	potential: z.number().min(1).max(ENGINE_LIMITS.MAX_SKILL),
	joinedDay: z.number().int().default(1),
	joinedSeason: z.number().int().default(1),
	stats: PlayerStatsSchema,
	traits: z.array(PlayerTraitSchema).default([]),
	form: z.number().min(1).max(8).default(5),
	formBackground: z.number().min(1).max(8).default(5),
	experience: z.number().min(1).max(10).default(1),
	energy: z.number().min(0).max(100),
	condition: z.number().min(0).max(100),
	morale: z.number().min(0).max(100),
	confidence: z.number().min(0).max(100).default(50),
	isTransferListed: z.boolean().default(false),
	marketValue: z.number().nonnegative(),
	wage: z.number().nonnegative(),
	isStarter: z.boolean().optional(),
	lastTrainingSkillChange: z.number().optional(),
	playedThisWeek: z.boolean().default(false),
	lastRatings: z.array(z.number()).default([]),
	seasonStats: SeasonStatsSchema.optional(),
	injuryDays: z.number().int().default(0),
	suspensionMatches: z.number().int().default(0),
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
    logoType: z.number().optional(),
	matchesPlayed: z.number().int().default(0),
	points: z.number().int().default(0),
    wins: z.number().int().default(0),
    draws: z.number().int().default(0),
    losses: z.number().int().default(0),
	goalsFor: z.number().int().default(0),
	goalsAgainst: z.number().int().default(0),
	goalDifference: z.number().int().default(0),
	budget: z.number(),
	pendingIncome: z.number().default(0),
	reputation: z.number().min(0).max(100),
	fanCount: z.number().int().nonnegative(),
	confidence: z.number().min(0).max(100),
	lastResults: z.array(z.number()).default([]),
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
	pressure: z.number().int().default(0),
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

export const BackupSlotSchema = z.object({
    id: z.number().optional(),
    saveId: z.number(),
    timestamp: z.number(),
    data: z.string(),
});

export const ExportDataSchema = z.object({
	gameState: GameStateSchema,
	teams: z.array(TeamSchema),
	players: z.array(PlayerSchema),
	matches: z.array(MatchSchema),
	leagues: z.array(LeagueSchema),
	news: z.array(NewsArticleSchema),
	history: z.array(z.any()),
    backups: z.array(BackupSlotSchema).optional(),
});

// --- Types dérivés (TypeScript) ---
export type PlayerPosition = z.infer<typeof PlayerPositionSchema>;
export type TacticType = z.infer<typeof TacticTypeSchema>;
export type StrategyType = z.infer<typeof StrategyTypeSchema>;
export type MatchEventType = z.infer<typeof MatchEventTypeSchema>;
export type PlayerTrait = z.infer<typeof PlayerTraitSchema>;
export type StaffTrait = z.infer<typeof StaffTraitSchema>;

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
export type PlayerMatchStats = z.infer<typeof PlayerMatchStatsSchema>;
export type SeasonStats = z.infer<typeof SeasonStatsSchema>;
export type BackupSlot = z.infer<typeof BackupSlotSchema>;
