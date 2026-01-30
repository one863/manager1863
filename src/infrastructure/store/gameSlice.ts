import { computeSaveHash, db, verifySaveIntegrity } from "@/core/db/db";
import { repairSaveData as runDataMigrations } from "@/core/db/migrations/data-migrations";
import { BackupService } from "@/core/services/backup-service";
import { ClubService } from "@/club/club-service";
import { MatchService } from "@/competition/match/match-service";

// Utilitaire pour lancer la simulation de journée dans un Web Worker
function simulateDayByDayInWorker(saveId: number, day: number, userTeamId: number, date: Date): Promise<any> {
    return new Promise((resolve, reject) => {
        // @ts-ignore
        const worker = new Worker(new URL("../../competition/match/match-simulation.worker.ts", import.meta.url), { type: "module" });
        worker.postMessage({ saveId, day, userTeamId, date });
        worker.onmessage = (event) => {
            if (event.data.success) {
                resolve(event.data.result);
            } else {
                reject(event.data.error);
            }
            worker.terminate();
        };
        worker.onerror = (err) => {
            reject(err);
            worker.terminate();
        };
    });
}
import { NewsService } from "@/news/service/news-service";
import { TrainingService } from "@/squad/training/training-service";
import { create } from "zustand";
import { useLiveMatchStore } from "@/infrastructure/store/liveMatchStore";
import type { MatchResult } from "@/core/types";

interface ViewHistory {
    view: string;
    params?: any;
}

interface GameState {
	currentSaveId: number | null;
	currentDate: Date;
	season: number;
	day: number;
	isProcessing: boolean;
	userTeamId: number | null;
	isTampered: boolean;
	isGameOver: boolean;
	unreadNewsCount: number;
	lastUpdate: number;
    navigationHistory: ViewHistory[];
    uiContext: Record<string, any>;

	initialize: (slotId: number, date: Date, teamId: number, managerName: string, teamName: string) => Promise<void>;
	loadGame: (slotId: number) => Promise<boolean>;
	advanceDate: () => Promise<void>;
	setProcessing: (status: boolean) => void;
	setUserTeam: (teamId: number) => void;
    quitGame: () => void;
	deleteSaveAndQuit: () => Promise<void>;
	refreshUnreadNewsCount: () => Promise<void>;
	finalizeLiveMatch: (finalResult: MatchResult) => Promise<void>;
	triggerRefresh: () => void;
    pushView: (view: string, params?: any) => void;
    popView: () => ViewHistory | null;
    setUIContext: (viewKey: string, value: any) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
	currentSaveId: null,
	currentDate: new Date("1863-09-01"),
	season: 1,
	day: 1,
	isProcessing: false,
	userTeamId: null,
	isTampered: false,
	isGameOver: false,
	unreadNewsCount: 0,
	lastUpdate: Date.now(),
    navigationHistory: [],
    uiContext: { squad: 'squad', club: 'finances', transfers: 'players' },

	initialize: async (slotId, date, teamId, _managerName, _teamName) => {
		useLiveMatchStore.getState().clearLiveMatch(slotId);
		set({
			currentSaveId: slotId, season: 1, day: 1, currentDate: date, userTeamId: teamId,
			isProcessing: false, isTampered: false, isGameOver: false, lastUpdate: Date.now(),
            navigationHistory: [], uiContext: { squad: 'squad', club: 'finances', transfers: 'players' }
		});
		await get().refreshUnreadNewsCount();
	},

	loadGame: async (slotId) => {
		if (!slotId) return false;
		set({ isProcessing: true });
		try {
			await runDataMigrations(slotId);
			const isValid = await verifySaveIntegrity(slotId);
			const state = await db.gameState.where("saveId").equals(slotId).first();
			const slot = await db.saveSlots.get(slotId);
			if (state && slot) {
				if (state.liveMatch) {
                    // Charger le match live depuis la DB (avec les logs de matchLogs)
					await useLiveMatchStore.getState().loadLiveMatchFromDb(slotId);
				} else {
					useLiveMatchStore.getState().clearLiveMatch(slotId);
				}
				set({
					currentSaveId: slotId, season: state.season || 1, day: state.day || 1, currentDate: state.currentDate,
					userTeamId: state.userTeamId, isProcessing: false, isTampered: !isValid, isGameOver: !!state.isGameOver,
					lastUpdate: Date.now(), navigationHistory: [], uiContext: { squad: 'squad', club: 'finances', transfers: 'players' }
				});
				await get().refreshUnreadNewsCount();
				return true;
			}
		} catch (e) { console.error("Load failed", e); }
		set({ isProcessing: false });
		return false;
	},

	refreshUnreadNewsCount: async () => {
		const { currentSaveId, day } = get();
		if (!currentSaveId) return;
		const unreadNews = await db.news.where("saveId").equals(currentSaveId).and((n) => !n.isRead).toArray();
		const visibleUnreadCount = unreadNews.filter((n) => n.day <= day).length;
		set({ unreadNewsCount: visibleUnreadCount });
	},

	advanceDate: async () => {
		const { currentDate, day, season, userTeamId, currentSaveId, isGameOver } = get();
		if (currentSaveId === null || userTeamId === null || isGameOver) return;
		
		set({ isProcessing: true });
		try {
            const nextDay = day + 1;
            const nextDate = new Date(currentDate);
            nextDate.setDate(nextDate.getDate() + 1);

            console.time('SimulateDayByDay');
            const pendingUserMatch = await simulateDayByDayInWorker(currentSaveId, day, userTeamId, currentDate);
            console.timeEnd('SimulateDayByDay');
            console.log('[advanceDate] Résultat simulateDayByDay (worker):', pendingUserMatch);

            console.time('DailyUpdates');
            try {
                await Promise.all([
                    ClubService.processDailyUpdates(userTeamId, currentSaveId, nextDay, nextDate),
                    TrainingService.processDailyUpdates(userTeamId, currentSaveId, nextDay, nextDate),
                    NewsService.processDailyNews(currentSaveId, nextDay, nextDate, userTeamId),
                ]);
            } catch (err) {
                console.error('[advanceDate] Erreur lors des DailyUpdates', err);
            }
            console.timeEnd('DailyUpdates');

            // Nettoyage périodique des données volumineuses (tous les 7 jours)
            if (day % 7 === 0) {
                console.time('CleanupOldNews');
                await NewsService.cleanupOldNews(currentSaveId, season);
                console.timeEnd('CleanupOldNews');
                console.time('CleanupOldUserMatchLogs');
                // Nettoyer les logs des anciens matchs utilisateur (garder seulement les 3 derniers jours)
                await MatchService.cleanupOldUserMatchLogs(currentSaveId, userTeamId, day);
                console.timeEnd('CleanupOldUserMatchLogs');
            }

            if (pendingUserMatch && pendingUserMatch.matchId !== null && pendingUserMatch.matchId !== undefined) {
                console.log('[advanceDate][USER_MATCH] Objet reçu:', pendingUserMatch, 'isProcessing:', get().isProcessing);
                await useLiveMatchStore.getState().initializeLiveMatch(
                    pendingUserMatch.matchId, 
                    pendingUserMatch.homeTeam, 
                    pendingUserMatch.awayTeam, 
                    pendingUserMatch.homePlayers,
                    pendingUserMatch.awayPlayers,
                    pendingUserMatch.result, 
                    currentSaveId
                );
                // Ajout d'un log et d'un flag pour forcer la transition UI
                console.log('[advanceDate] Match utilisateur détecté, bascule vers MatchLive', { matchId: pendingUserMatch.matchId });
                set({ isProcessing: false }); // Désactive immédiatement le flag pour ne pas bloquer l'affichage
                // Si besoin, déclencher ici un callback ou un event pour forcer la navigation UI
            } else {
                const userTeam = await db.teams.get(userTeamId);
                if (userTeam) {
                    const seasonEnded = await MatchService.checkSeasonEnd(currentSaveId, userTeam.leagueId);
                    if (seasonEnded) {
                        // On affiche le classement final, puis on reset au passage effectif à la nouvelle saison (voir ci-dessous)
                        await MatchService.checkSeasonEnd(currentSaveId, userTeam.leagueId, true);
                        await updateGameState(currentSaveId, userTeamId, 1, season + 1, nextDate);
                        set({ day: 1, season: season + 1, currentDate: nextDate, lastUpdate: Date.now() });
                    } else {
                        await updateGameState(currentSaveId, userTeamId, nextDay, season, nextDate);
                        set({ day: nextDay, currentDate: nextDate, lastUpdate: Date.now() });
                    }
                }
            }
            await get().refreshUnreadNewsCount();
        } catch (err) {
            console.error("Advance date error:", err);
        } finally {
            set({ isProcessing: false });
        }
	},

	finalizeLiveMatch: async (finalResult: MatchResult) => {
		const { currentSaveId, userTeamId, day, season, currentDate } = get();
        const liveMatch = useLiveMatchStore.getState().liveMatch;
        
		if (!currentSaveId || !userTeamId || !liveMatch) return;
        set({ isProcessing: true });
        try {
            const match = await db.matches.get(liveMatch.matchId);
            if (!match) throw new Error("Match not found");


            await MatchService.saveMatchResult(match, finalResult, currentSaveId, currentDate);
            await db.gameState.where("saveId").equals(currentSaveId).modify({ liveMatch: null });
            useLiveMatchStore.getState().clearLiveMatch(currentSaveId);
            // Purge immédiate des logs des anciens matchs utilisateur
            await MatchService.cleanupOldUserMatchLogs(currentSaveId, userTeamId, day);

            const nextDay = day + 1;
            const nextDate = new Date(currentDate);
            nextDate.setDate(nextDate.getDate() + 1);

            const userTeam = await db.teams.get(userTeamId);
            let finalDay = nextDay;
            let finalSeason = season;

            if (userTeam) {
                const seasonEnded = await MatchService.checkSeasonEnd(currentSaveId, userTeam.leagueId);
                if (seasonEnded) {
                    await MatchService.checkSeasonEnd(currentSaveId, userTeam.leagueId, true);
                    finalDay = 1; finalSeason = season + 1;
                }
            }

            await updateGameState(currentSaveId, userTeamId, finalDay, finalSeason, nextDate);
            set((state) => ({ 
                day: finalDay, season: finalSeason, currentDate: nextDate, 
                lastUpdate: Date.now(),
                uiContext: { ...state.uiContext, competition: 'table' } 
            }));
            await get().refreshUnreadNewsCount();
        } catch (err) {
            console.error("Finalize error:", err);
        } finally {
            set({ isProcessing: false });
        }
	},

    quitGame: () => {
        const { currentSaveId } = get();
        if (currentSaveId) {
            useLiveMatchStore.getState().clearLiveMatch(currentSaveId);
        }
        set({
            currentSaveId: null,
            userTeamId: null,
            isGameOver: false,
            unreadNewsCount: 0,
            season: 1,
            day: 1,
            lastUpdate: Date.now(),
            navigationHistory: [],
            uiContext: { squad: 'squad', club: 'finances', transfers: 'players' }
        });
    },

	deleteSaveAndQuit: async () => {
		const { currentSaveId } = get();
		if (currentSaveId) {
			await db.transaction("rw", [db.players, db.teams, db.matches, db.leagues, db.saveSlots, db.gameState, db.news, db.history, db.backups], async () => {
				await Promise.all([
					db.saveSlots.delete(currentSaveId),
					db.gameState.where("saveId").equals(currentSaveId).delete(),
					db.players.where("saveId").equals(currentSaveId).delete(),
					db.teams.where("saveId").equals(currentSaveId).delete(),
					db.matches.where("saveId").equals(currentSaveId).delete(),
					db.news.where("saveId").equals(currentSaveId).delete(),
					db.history.where("saveId").equals(currentSaveId).delete(),
                    db.backups.where("saveId").equals(currentSaveId).delete(),
				]);
			});
		}
		get().quitGame();
	},

	setProcessing: (status) => set({ isProcessing: status }),
	setUserTeam: (id) => set({ userTeamId: id }),
	triggerRefresh: () => set({ lastUpdate: Date.now() }),

    pushView: (view, params) => set(state => ({ navigationHistory: [...state.navigationHistory, { view, params }] })),
    popView: () => {
        const history = get().navigationHistory;
        if (history.length === 0) return null;
        const last = history[history.length - 1];
        set({ navigationHistory: history.slice(0, -1) });
        return last;
    },
    setUIContext: (viewKey, value) => set(state => ({ uiContext: { ...state.uiContext, [viewKey]: value } }))
}));

async function updateGameState(saveId: number, teamId: number, day: number, season: number, date: Date) {
	if (!saveId || !teamId) return;
	await db.gameState.where("saveId").equals(saveId).modify({ day, season, currentDate: date, userTeamId: teamId });
	const slot = await db.saveSlots.get(saveId);
	if (slot) await db.saveSlots.update(saveId, { day, season, lastPlayedDate: new Date() });
	
    computeSaveHash(saveId).then(newHash => {
        // TODO: Ajouter hash au type GameStateData si nécessaire
        // db.gameState.where("saveId").equals(saveId).modify({ hash: newHash });
    });
	BackupService.performAutoBackup(saveId).catch(err => console.error("Auto-backup failed", err));
}
