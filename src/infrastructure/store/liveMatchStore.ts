import { db } from "@/core/db/db";
import { create } from "zustand";

interface LiveMatchData {
	matchId: number;
	homeTeam: any;
	awayTeam: any;
    homePlayers: any[];
    awayPlayers: any[];
	result: any; // Peut être null si la simu n'est pas finie
	currentTime: number;
    isPaused: boolean;
    activeTab: "flux" | "2d" | "stats" | "players";
}

interface LiveMatchState {
	liveMatch: LiveMatchData | null;

	initializeLiveMatch: (
		matchId: number,
		homeTeam: any,
		awayTeam: any,
        homePlayers: any[],
        awayPlayers: any[],
		result: any | null, // Peut être null
		saveId: number,
		startTime?: number,
        isPaused?: boolean,
        activeTab?: "flux" | "2d" | "stats" | "players"
	) => Promise<void>;
	updateLiveMatchState: (data: Partial<LiveMatchData>, saveId?: number) => Promise<void>;
	clearLiveMatch: (saveId: number) => Promise<void>;
    loadLiveMatchFromDb: (saveId: number) => Promise<void>;
}

export const useLiveMatchStore = create<LiveMatchState>((set, get) => ({
	liveMatch: null,

	initializeLiveMatch: async (
		matchId,
		homeTeam,
		awayTeam,
        homePlayers,
        awayPlayers,
		result,
		saveId,
		startTime = 0,
        isPaused = true,
        activeTab = "flux"
	) => {
		const initialData: LiveMatchData = {
			matchId,
			homeTeam,
			awayTeam,
            homePlayers,
            awayPlayers,
			result,
			currentTime: startTime,
            isPaused,
            activeTab
		};

		if (saveId) {
			// Sauvegarder une version allégée en DB (sans logs volumineux)
			// Les logs complets restent en mémoire pour le débogage
			const lightResult = result ? {
				matchId: result.matchId,
				homeTeamId: result.homeTeamId,
				awayTeamId: result.awayTeamId,
				homeScore: result.homeScore,
				awayScore: result.awayScore,
				stats: result.stats,
				scorers: result.scorers,
				ratings: result.ratings,
				stoppageTime: result.stoppageTime,
				analysis: result.analysis,
				ballHistory: result.ballHistory,
				// Inclure debugLogs AVEC le bag pour la visualisation
				debugLogs: (result.debugLogs || []).map((log: any) => ({
					time: log.time,
					type: log.type,
					text: log.text,
					eventSubtype: log.eventSubtype,
					playerName: log.playerName,
					teamId: log.teamId,
					possessionTeamId: log.possessionTeamId,
					ballPosition: log.ballPosition,
					statImpact: log.statImpact,
					bag: log.bag,
					drawnToken: log.drawnToken
				}))
			} : null;
			await db.gameState.where("saveId").equals(saveId).modify({ 
                liveMatch: { ...initialData, result: lightResult }
            });
		}
		set({ liveMatch: initialData });
	},

	updateLiveMatchState: async (data, saveId) => {
		const { liveMatch } = get();
		if (!liveMatch) return;

		const updatedMatch = { ...liveMatch, ...data };
		set({ liveMatch: updatedMatch });

        if (saveId) {
            // Mise à jour partielle pour ne pas écraser result si déjà présent
            await db.gameState.where("saveId").equals(saveId).modify(oldState => {
                oldState.liveMatch = { ...oldState.liveMatch, ...data };
            });
        }
	},

	clearLiveMatch: async (saveId) => {
		set({ liveMatch: null });
        if (saveId) {
            await db.gameState.where("saveId").equals(saveId).modify({ liveMatch: null });
        }
	},

    loadLiveMatchFromDb: async (saveId) => {
        const gameState = await db.gameState.where("saveId").equals(saveId).first();
        if (gameState?.liveMatch) {
            set({ liveMatch: gameState.liveMatch });
        }
    }
}));
