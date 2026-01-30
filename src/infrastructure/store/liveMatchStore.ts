// /src/infrastructure/store/liveMatchStore.ts
import { db } from "@/core/db/db";
import { create } from "zustand";

// 1. Définition des interfaces (Exportées pour être trouvables par le Store)
export interface LiveMatchData {
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

export interface LiveMatchState {
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

// 2. Implémentation du Store avec typage strict
export const useLiveMatchStore = create<LiveMatchState>((set, get) => ({
    liveMatch: null,

    initializeLiveMatch: async (
        matchId: number, 
        homeTeam: any, 
        awayTeam: any, 
        homePlayers: any[], 
        awayPlayers: any[], 
        result: any | null, 
        saveId: number,
        startTime: number = 0, 
        isPaused: boolean = true, 
        activeTab: "highlights" | "live" | "stats" | "players" = "live"
    ) => {
        // Purge des logs précédents
        if (saveId) {
            await db.matchLogs.where("saveId").equals(saveId).delete();
        }

        // Stockage des logs lourds dans la table dédiée matchLogs
        if (saveId && result) {
            console.log('[DEBUG][initializeLiveMatch] Ecriture matchLogs', {
                saveId,
                matchId,
                debugLogs: result.debugLogs,
                events: result.events,
                ballHistory: result.ballHistory
            });
            await db.matchLogs.put({
                saveId,
                matchId,
                debugLogs: result.debugLogs || [],
                events: result.events || [],
                ballHistory: result.ballHistory || []
            });
        }

        // Préparation du résultat "léger" pour le gameState (sans les logs)
        const lightResult = result ? {
            ...result,
            debugLogs: [],
            events: [],
            ballHistory: []
        } : null;

        const initialData: LiveMatchData = {
            matchId, homeTeam, awayTeam, homePlayers, awayPlayers,
            result, // En mémoire vive, on garde tout
            currentTime: startTime, isPaused, activeTab
        };

        if (saveId) {
            await db.gameState.where("saveId").equals(saveId).modify({ 
                liveMatch: { ...initialData, result: lightResult }
            });
        }
        
        set({ liveMatch: initialData });
    },

    updateLiveMatchState: async (data: Partial<LiveMatchData>, saveId?: number) => {
        const { liveMatch } = get();
        if (!liveMatch) return;
        
        const updatedMatch = { ...liveMatch, ...data };
        set({ liveMatch: updatedMatch });

        if (saveId) {
            await db.gameState.where("saveId").equals(saveId).modify(oldState => {
                if (oldState.liveMatch) {
                    // On ne persiste que les métadonnées de lecture
                    oldState.liveMatch.currentTime = updatedMatch.currentTime;
                    oldState.liveMatch.isPaused = updatedMatch.isPaused;
                    oldState.liveMatch.activeTab = updatedMatch.activeTab;
                }
            });
        }
    },

    clearLiveMatch: async (saveId: number) => {
        set({ liveMatch: null });
        if (saveId) {
            await db.gameState.where("saveId").equals(saveId).modify({ liveMatch: null });
            await db.matchLogs.where("saveId").equals(saveId).delete();
        }
    },

    loadLiveMatchFromDb: async (saveId: number) => {
        const gameState = await db.gameState.where("saveId").equals(saveId).first();
        if (gameState?.liveMatch) {
            const matchId = gameState.liveMatch.matchId;
            // On récupère les logs lourds supprimés du gameState pour reconstruire l'objet complet
            const logs = await db.matchLogs.where({ saveId, matchId }).first();
            console.log('[DEBUG][loadLiveMatchFromDb] Lecture matchLogs', { saveId, matchId, logs });
            const fullMatchData: LiveMatchData = {
                ...gameState.liveMatch,
                result: {
                    ...gameState.liveMatch.result,
                    debugLogs: logs?.debugLogs || [],
                    events: logs?.events || [],
                    ballHistory: logs?.ballHistory || []
                }
            };
            set({ liveMatch: fullMatchData });
        }
    }
}));