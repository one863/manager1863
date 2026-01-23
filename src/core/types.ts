import { z } from "zod";

export type TacticType = "NORMAL" | "POSSESSION" | "COUNTER" | "LONG_BALL" | "PARK_BUS" | "WING_PLAY";
export type StrategyType = "DEFENSIVE" | "BALANCED" | "OFFENSIVE";

export interface Team {
    id?: number;
    saveId: number;
    leagueId: number;
    name: string;
    reputation: number;
    budget: number;
    primaryColor: string;
    secondaryColor: string;
    stadiumName: string;
    stadiumCapacity: number;
    confidence: number;
    seasonGoal: string;
    fanCount: number;
    points: number;
    matchesPlayed: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
    wins: number;
    draws: number;
    losses: number;
    tacticType: string;
    formation: string;
    version: number;
}

export interface Player {
    id?: number;
    saveId: number;
    teamId: number;
    firstName: string;
    lastName: string;
    age: number;
    role: string;
    position: "GK" | "DEF" | "MID" | "FWD";
    side: "L" | "R" | "C";
    skill: number;
    potential: number; // Max atteignable
    marketValue: number;
    wage: number;
    energy: number;    // Forme actuelle
    morale: number;    // Confiance actuelle
    condition: number; // Fraîcheur physique globale
    isStarter: boolean;
    stats: {
        technical: number;
        finishing: number;
        defense: number;
        physical: number;
        mental: number;
        goalkeeping: number;
    };
    traits: string[];
    joinedDay: number;
    joinedSeason: number;
    dna: string;
    injuryDays: number;
    suspensionMatches: number;
    playedThisWeek: boolean;
    lastRatings: number[];
    seasonStats: SeasonStats;
}

export interface SeasonStats {
    matches: number;
    goals: number;
    assists: number;
    avgRating: number;
    xg: number;
    xa: number;
    distance: number;
    duelsWinRate: number;
    passAccuracy: number;
}

export interface League {
    id?: number;
    saveId: number;
    name: string;
    level: number;
    reputation: number;
    promotionSpots: number;
    relegationSpots: number;
}

export interface Match {
    id?: number;
    saveId: number;
    leagueId: number;
    day: number;
    homeTeamId: number;
    awayTeamId: number;
    homeScore: number;
    awayScore: number;
    played: boolean;
    pressure: number;
    stoppageTime?: number; // --- NOUVEAU ---
    details?: MatchResult;  // --- NOUVEAU: Référence le MatchResult complet ---
}

export interface MatchResult {
    matchId: number;
    homeTeamId: number;
    awayTeamId: number;
    homeScore: number;
    awayScore: number;
    events: any[];
    stats: any; // Contient xG, duels, interceptions, possession
    ballHistory: any[];
    debugLogs?: any[];
    stoppageTime?: number;
}

export type StaffRole = "COACH" | "PHYSICAL_TRAINER" | "VIDEO_ANALYST";

export interface GameStateData {
    saveId: number;
    currentDate: Date;
    day: number;
    season: number;
    userTeamId: number;
    liveMatch: any;
    isGameOver?: boolean;
}

export interface NewsArticle {
    id?: number;
    saveId: number;
    day: number;
    date: Date;
    title: string;
    content: string;
    category: "MATCH" | "TRANSFER" | "CLUB" | "LEAGUE";
    isRead: boolean;
    importance: number;
}

export const ExportDataSchema = z.object({
    gameState: z.any(),
    teams: z.array(z.any()),
    players: z.array(z.any()),
    matches: z.array(z.any()),
    leagues: z.array(z.any()),
    news: z.array(z.any()),
    staff: z.array(z.any()).optional(),
    history: z.array(z.any()).optional()
});

export type ExportData = z.infer<typeof ExportDataSchema>;
