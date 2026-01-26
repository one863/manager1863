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

		if (saveId && result?.matchId) {
			// 1. Sauvegarder les logs complets dans la table séparée matchLogs
			await db.matchLogs.put({
				saveId,
				matchId: result.matchId,
				debugLogs: result.debugLogs || [],
				events: result.events || [],
				ballHistory: result.ballHistory || []
			});

			// 2. Sauvegarder une version allégée dans gameState (sans les logs volumineux)
			const lightResult = {
				matchId: result.matchId,
				homeTeamId: result.homeTeamId,
				awayTeamId: result.awayTeamId,
				homeName: result.homeName,
				awayName: result.awayName,
				homeScore: result.homeScore,
				awayScore: result.awayScore,
				stats: result.stats,
				scorers: result.scorers,
				ratings: result.ratings,
				stoppageTime: result.stoppageTime,
				analysis: result.analysis
				// PAS de debugLogs, events, ballHistory ici (ils sont dans matchLogs)
			};
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
			// Supprimer les logs de match de la table séparée
			await db.matchLogs.where("saveId").equals(saveId).delete();
            await db.gameState.where("saveId").equals(saveId).modify({ liveMatch: null });
        }
	},

    loadLiveMatchFromDb: async (saveId) => {
        const gameState = await db.gameState.where("saveId").equals(saveId).first();
        if (gameState?.liveMatch) {
			const storedMatch = gameState.liveMatch;
			
			// Récupérer les logs depuis la table séparée matchLogs
			const matchLogs = await db.matchLogs
				.where("[saveId+matchId]")
				.equals([saveId, storedMatch.result?.matchId || storedMatch.matchId || 0])
				.first();
			
			// Reconstruire le liveMatch complet avec les logs
			const fullResult = storedMatch.result ? {
				...storedMatch.result,
				debugLogs: matchLogs?.debugLogs || [],
				events: matchLogs?.events || [],
				ballHistory: matchLogs?.ballHistory || []
			} : null;

			const fullLiveMatch: LiveMatchData = {
				matchId: storedMatch.matchId,
				homeTeam: storedMatch.homeTeam,
				awayTeam: storedMatch.awayTeam,
				homePlayers: storedMatch.homePlayers || [],
				awayPlayers: storedMatch.awayPlayers || [],
				result: fullResult,
				currentTime: storedMatch.currentTime || 0,
				isPaused: storedMatch.isPaused ?? true,
				activeTab: storedMatch.activeTab || "flux"
			};

            set({ liveMatch: fullLiveMatch });
        }
    }
}));
