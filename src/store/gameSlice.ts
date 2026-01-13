import { create } from 'zustand';
import { db, verifySaveIntegrity, computeSaveHash } from '@/db/db';
import { MatchService } from '@/services/match-service';
import { BackupService } from '@/services/backup-service';
import { ClubService } from '@/services/club-service';
import { TrainingService } from '@/services/training-service';
import { NewsService } from '@/services/news-service';
import { repairSaveData as runDataMigrations } from '@/db/migrations/data-migrations';
import { useLiveMatchStore } from './liveMatchStore';

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
  
  initialize: (slotId: number, date: Date, teamId: number, managerName: string, teamName: string) => Promise<void>;
  loadGame: (slotId: number) => Promise<boolean>;
  advanceDate: () => Promise<void>;
  setProcessing: (status: boolean) => void;
  setUserTeam: (teamId: number) => void;
  deleteSaveAndQuit: () => Promise<void>;
  refreshUnreadNewsCount: () => Promise<void>;
}

export const useGameStore = create<GameState>((set, get) => ({
  currentSaveId: null, currentDate: new Date('1863-09-01'), 
  season: 1, day: 1,
  isProcessing: false,
  userTeamId: null, isTampered: false, isGameOver: false,
  unreadNewsCount: 0,

  initialize: async (slotId, date, teamId, managerName, teamName) => {
    set({ 
      currentSaveId: slotId, 
      season: 1, 
      day: 1, 
      currentDate: date, 
      userTeamId: teamId, 
      isProcessing: false, 
      isTampered: false, 
      isGameOver: false 
    });
    await get().refreshUnreadNewsCount();
  },

  loadGame: async (slotId) => {
    set({ isProcessing: true });
    await runDataMigrations(slotId);
    const isValid = await verifySaveIntegrity(slotId);
    const state = await db.gameState.get(slotId);
    const slot = await db.saveSlots.get(slotId);
    
    if (state && slot) {
      // Initialize Live Match Store if needed
      if (state.liveMatch) {
        useLiveMatchStore.getState().initializeLiveMatch(
          state.liveMatch.matchId,
          state.liveMatch.homeTeam,
          state.liveMatch.awayTeam,
          state.liveMatch.result
        );
      } else {
        useLiveMatchStore.getState().clearLiveMatch();
      }

      set({ 
        currentSaveId: slotId, 
        season: state.season || 1,
        day: state.day || 1,
        currentDate: state.currentDate, 
        userTeamId: state.userTeamId, 
        isProcessing: false, 
        isTampered: !isValid, 
        isGameOver: !!state.isGameOver
      });
      await get().refreshUnreadNewsCount();
      return true;
    }
    set({ isProcessing: false });
    return false;
  },

  refreshUnreadNewsCount: async () => {
    const { currentSaveId } = get();
    if (!currentSaveId) return;
    const count = await db.news.where('saveId').equals(currentSaveId).and(n => !n.isRead).count();
    set({ unreadNewsCount: count });
  },

  advanceDate: async () => {
    const { currentDate, day, season, userTeamId, currentSaveId, isGameOver } = get();
    if (currentSaveId === null || userTeamId === null || isGameOver) return;
    set({ isProcessing: true });

    const pendingUserMatch = await MatchService.simulateDayByDay(currentSaveId, day, userTeamId, currentDate);
    await ClubService.processDailyUpdates(userTeamId, currentSaveId, day, currentDate);
    await TrainingService.processDailyUpdates(userTeamId, currentSaveId, day, currentDate);
    
    // Purge old news every 30 days
    if (day % 30 === 0) {
      await NewsService.cleanupOldNews(currentSaveId, season);
    }

    await get().refreshUnreadNewsCount();

    if (pendingUserMatch) {
      // Init live match via the new store
      await useLiveMatchStore.getState().initializeLiveMatch(
        pendingUserMatch.matchId,
        pendingUserMatch.homeTeam,
        pendingUserMatch.awayTeam,
        pendingUserMatch.result
      );
      set({ isProcessing: false });
    } else {
      const nextDay = day + 1;
      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() + 1);

      const userTeam = await db.teams.get(userTeamId);
      if (userTeam) {
        const seasonEnded = await MatchService.checkSeasonEnd(currentSaveId, userTeam.leagueId);
        if (seasonEnded) {
           const nextSeason = season + 1;
           await updateGameState(currentSaveId, userTeamId, 1, nextSeason, nextDate);
           set({ day: 1, season: nextSeason, currentDate: nextDate, isProcessing: false });
           return;
        }
      }
      
      await updateGameState(currentSaveId, userTeamId, nextDay, season, nextDate);
      set({ day: nextDay, currentDate: nextDate, isProcessing: false });
    }
  },

  deleteSaveAndQuit: async () => {
    const { currentSaveId } = get();
    if (currentSaveId) {
      await db.transaction('rw', [db.players, db.teams, db.matches, db.leagues, db.saveSlots, db.gameState, db.news, db.history], async () => {
        await Promise.all([db.saveSlots.delete(currentSaveId), db.gameState.delete(currentSaveId), db.players.where('saveId').equals(currentSaveId).delete(), db.teams.where('saveId').equals(currentSaveId).delete(), db.matches.where('saveId').equals(currentSaveId).delete(), db.news.where('saveId').equals(currentSaveId).delete(), db.history.where('saveId').equals(currentSaveId).delete()]);
      });
    }
    useLiveMatchStore.getState().clearLiveMatch();
    set({ currentSaveId: null, userTeamId: null, isGameOver: false, unreadNewsCount: 0, season: 1, day: 1 });
  },

  setProcessing: (status) => set({ isProcessing: status }),
  setUserTeam: (id) => set({ userTeamId: id }),
}));

async function updateGameState(saveId: number, teamId: number, day: number, season: number, date: Date) {
  // Update game state
  await db.gameState.update(saveId, { day, season, currentDate: date, userTeamId: teamId });
  const slot = await db.saveSlots.get(saveId);
  if (slot) await db.saveSlots.update(saveId, { day, season, lastPlayedDate: new Date() });
  
  // Re-fetch state to compute accurate hash
  const state = await db.gameState.get(saveId);
  if (state && state.userTeamId) {
    const userTeam = await db.teams.get(state.userTeamId);
    if (userTeam) {
      const newHash = await computeSaveHash(saveId);
      await db.gameState.update(saveId, { hash: newHash });
    }
  }

  await BackupService.performAutoBackup(saveId);
}
