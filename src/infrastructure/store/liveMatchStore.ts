import { db } from "@/core/db/db";
import { create } from "zustand";

interface LiveMatchData {
    matchId: number;
    homeTeam: any;
    awayTeam: any;
    homePlayers: any[];
    awayPlayers: any[];
    result: any; 
    currentTime: number;
    isPaused: boolean;
    activeTab: "highlights" | "live" | "stats" | "players";
}

interface LiveMatchState {
    liveMatch: LiveMatchData | null;
    initializeLiveMatch: (
        matchId: number,
        homeTeam: any,
        awayTeam: any,
        homePlayers: any[],
        awayPlayers: any[],
        result: any | null,
        saveId: number,
        startTime?: number,
        isPaused?: boolean,
        activeTab?: "highlights" | "live" | "stats" | "players"
    ) => Promise<void>;
    updateLiveMatchState: (data: Partial<LiveMatchData>, saveId?: number) => Promise<void>;
    clearLiveMatch: (saveId: number) => Promise<void>;
    loadLiveMatchFromDb: (saveId: number) => Promise<void>;
}

export const useLiveMatchStore = create<LiveMatchState>((set, get) => ({
    liveMatch: null,

    initializeLiveMatch: async (
        matchId, homeTeam, awayTeam, homePlayers, awayPlayers, result, saveId,
        startTime = 0, isPaused = true, activeTab = "live"
    ) => {
        // Purge tous les logs IA vs IA dès le lancement du live utilisateur
        if (saveId) {
            await db.matchLogs.where("saveId").equals(saveId).delete();
        }

        const initialData: LiveMatchData = {
            matchId, homeTeam, awayTeam, homePlayers, awayPlayers,
            result, currentTime: startTime, isPaused, activeTab
        };

        if (saveId) {
            // Sérialisation propre pour la DB : on conserve les IDs cruciaux
            const lightResult = result ? {
                ...result,
                debugLogs: (result.debugLogs || []).map((log: any) => ({
                    time: log.time,
                    type: log.type,
                    text: log.text,
                    eventSubtype: log.eventSubtype,
                    playerName: log.playerName,
                    teamId: log.teamId,
                    possessionTeamId: log.possessionTeamId,
                    ballPosition: log.ballPosition,
                    // On conserve le bag avec les IDs et ownerIds pour la vue Terrain/Sac
                    bag: (log.bag || []).map((t: any) => ({
                        id: t.id,
                        type: t.type,
                        teamId: t.teamId,
                        ownerId: t.ownerId,
                        position: t.position
                    })),
                    drawnToken: log.drawnToken ? {
                        id: log.drawnToken.id,
                        type: log.drawnToken.type,
                        teamId: log.drawnToken.teamId,
                        ownerId: log.drawnToken.ownerId,
                        position: log.drawnToken.position
                    } : null
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
            await db.gameState.where("saveId").equals(saveId).modify(oldState => {
                oldState.liveMatch = { ...oldState.liveMatch, ...data };
            });
        }
    },

    clearLiveMatch: async (saveId) => {
        set({ liveMatch: null });
        if (saveId) {
            await db.gameState.where("saveId").equals(saveId).modify({ liveMatch: null });
            // Purge tous les logs volumineux du slot courant
            await db.matchLogs.where("saveId").equals(saveId).delete();
        }
    },

    loadLiveMatchFromDb: async (saveId) => {
        const gameState = await db.gameState.where("saveId").equals(saveId).first();
        if (gameState?.liveMatch) {
            set({ liveMatch: gameState.liveMatch });
        }
    }
}));