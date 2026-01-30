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
        try {
            if (saveId) {
                console.log('[LiveMatchStore] Purge logs...');
                await db.matchLogs.where("saveId").equals(saveId).delete();
                console.log('[LiveMatchStore] Purge OK');
            }
        } catch (e) {
            console.error('[LiveMatchStore] Erreur purge logs', e);
        }

        // Stockage des logs lourds dans la table dédiée matchLogs
        try {
            if (saveId && result) {
                console.log('[LiveMatchStore] Ecriture matchLogs...', {
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
                console.log('[LiveMatchStore] Ecriture matchLogs OK');
            }
        } catch (e) {
            console.error('[LiveMatchStore] Erreur écriture matchLogs', e);
        }

        // Préparation du résultat "léger" pour le gameState (sans les logs)
        let lightResult = null;
        try {
            lightResult = result ? {
                ...result,
                debugLogs: [],
                events: [],
                ballHistory: []
            } : null;
            console.log('[LiveMatchStore] lightResult créé', lightResult);
        } catch (e) {
            console.error('[LiveMatchStore] Erreur création lightResult', e);
        }

        // On ne sauvegarde pas de liveMatch vide (matchId null)
        if (matchId === null || matchId === undefined) {
            set({ liveMatch: null });
            if (saveId) {
                await db.gameState.where("saveId").equals(saveId).modify({ liveMatch: null });
            }
            console.warn('[LiveMatchStore] Aucun match utilisateur à sauvegarder, liveMatch ignoré');
            return;
        }

        const initialData: LiveMatchData = {
            matchId, homeTeam, awayTeam, homePlayers, awayPlayers,
            result, // En mémoire vive, on garde tout
            currentTime: startTime, isPaused, activeTab
        };

        try {
            if (saveId) {
                console.log('[LiveMatchStore] Ecriture gameState...');
                await db.gameState.where("saveId").equals(saveId).modify({ 
                    liveMatch: { ...initialData, result: lightResult }
                });
                console.log('[LiveMatchStore] Ecriture gameState OK');
            }
        } catch (e) {
            console.error('[LiveMatchStore] Erreur écriture gameState', e);
        }

        console.log('[LiveMatchStore] set liveMatch', initialData);
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
            if (!matchId) {
                console.error('[ERROR][loadLiveMatchFromDb] matchId absent dans gameState.liveMatch', { gameState });
                return;
            }
            // On récupère les logs lourds supprimés du gameState pour reconstruire l'objet complet
            const logs = await db.matchLogs.where({ saveId, matchId }).first();
            console.log('[DEBUG][loadLiveMatchFromDb] Lecture matchLogs', { saveId, matchId, logs });
            if (!logs) {
                console.error('[ERROR][loadLiveMatchFromDb] Aucun logs trouvés pour le match', { saveId, matchId });
                return;
            }
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