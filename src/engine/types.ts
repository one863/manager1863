import { z } from 'zod';

// --- Schémas de base ---

export const TeamRatingsSchema = z.object({
  midfield: z.number().min(1).max(20),
  attackLeft: z.number().min(1).max(20),
  attackCenter: z.number().min(1).max(20),
  attackRight: z.number().min(1).max(20),
  defenseLeft: z.number().min(1).max(20),
  defenseCenter: z.number().min(1).max(20),
  defenseRight: z.number().min(1).max(20),
  setPieces: z.number().min(1).max(20),
  tacticSkill: z.number().min(1).max(20),
  tacticType: z.enum(['NORMAL', 'CA', 'PRESSING', 'AIM', 'AOW']),
});

export const MatchEventSchema = z.object({
  minute: z.number().int().min(0).max(120),
  type: z.enum(['GOAL', 'MISS', 'SE', 'CARD', 'INJURY', 'TRANSITION', 'SET_PIECE', 'SPECIAL']),
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
});

// --- Schémas de la Base de Données (Persistance) ---

export const PlayerStatsSchema = z.object({
  speed: z.number().int().min(1).max(100),
  strength: z.number().int().min(1).max(100),
  dribbling: z.number().int().min(1).max(100),
  shooting: z.number().int().min(1).max(100),
  defense: z.number().int().min(1).max(100),
  passing: z.number().int().min(1).max(100),
  stamina: z.number().int().min(1).max(100),
});

export const PlayerSchema = z.object({
  id: z.number().optional(),
  saveId: z.number(),
  teamId: z.number(),
  firstName: z.string(),
  lastName: z.string(),
  age: z.number().int().min(14).max(50),
  position: z.enum(['GK', 'DEF', 'MID', 'FWD']),
  side: z.enum(['L', 'C', 'R']).default('C'),
  dna: z.string(),
  skill: z.number().min(0).max(100),
  stats: PlayerStatsSchema,
  energy: z.number().min(0).max(100),
  condition: z.number().min(0).max(100),
  morale: z.number().min(0).max(100),
  marketValue: z.number().nonnegative(),
  wage: z.number().nonnegative(),
  isStarter: z.boolean().optional(),
});

export const TeamSchema = z.object({
  id: z.number().optional(),
  saveId: z.number(),
  name: z.string(),
  leagueId: z.number(),
  managerName: z.string().optional(),
  matchesPlayed: z.number().int().default(0),
  points: z.number().int().default(0),
  goalsFor: z.number().int().default(0),
  goalsAgainst: z.number().int().default(0),
  goalDifference: z.number().int().default(0),
  budget: z.number(),
  reputation: z.number().min(0).max(100),
  fanCount: z.number().int().nonnegative(),
  confidence: z.number().min(0).max(100),
  stadiumName: z.string(),
  stadiumCapacity: z.number().int().nonnegative(),
  stadiumLevel: z.number().int().min(1),
  sponsorName: z.string().optional(),
  sponsorIncome: z.number().nonnegative().optional(),
  sponsorExpiryDate: z.coerce.date().optional(),
  stadiumUpgradeEndDay: z.number().optional(),
  stadiumProject: z.any().optional(),
  seasonGoal: z.enum(['CHAMPION', 'PROMOTION', 'MID_TABLE', 'AVOID_RELEGATION']).optional(),
  tacticType: z.enum(['NORMAL', 'CA', 'PRESSING', 'AIM', 'AOW']).default('NORMAL'),
  formation: z.string().default('4-4-2'),
  version: z.number(),
});

export const MatchSchema = z.object({
  id: z.number().optional(),
  saveId: z.number(),
  leagueId: z.number(),
  homeTeamId: z.number(),
  awayTeamId: z.number(),
  homeScore: z.number().int(),
  awayScore: z.number().int(),
  date: z.coerce.date(),
  played: z.boolean(),
  details: MatchResultSchema.optional(),
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
  leagues: z.array(z.any()), // Optionnel pour l'instant
  news: z.array(z.any()),
  history: z.array(z.any()),
});

// --- Types dérivés (TypeScript) ---

export type TeamRatings = z.infer<typeof TeamRatingsSchema>;
export type MatchEvent = z.infer<typeof MatchEventSchema>;
export type MatchResult = z.infer<typeof MatchResultSchema>;
export type Player = z.infer<typeof PlayerSchema>;
export type Team = z.infer<typeof TeamSchema>;
export type Match = z.infer<typeof MatchSchema>;
export type GameStateData = z.infer<typeof GameStateSchema>;
export type ExportData = z.infer<typeof ExportDataSchema>;
