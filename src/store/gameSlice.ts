import { create } from 'zustand';
import { db, verifySaveIntegrity, computeSaveHash, CURRENT_DATA_VERSION } from '@/db/db';
import { MatchService } from '@/services/match-service';
import { BackupService } from '@/services/backup-service';
import { ClubService } from '@/services/club-service';
import { TrainingService } from '@/services/training-service';
import { repairSaveData as runDataMigrations } from '@/db/migrations/data-migrations';

interface LiveMatchData {
  matchId: number; homeTeam: any; awayTeam: any; result: any;
  currentMinute?: number;
}

interface GameState {
  currentSaveId: number | null; 
  currentDate: Date;
  season: number;    
  day: number;       
  isProcessing: boolean;
  userTeamId: number | null; isTampered: boolean; isGameOver: boolean;
  liveMatch: LiveMatchData | null;
  unreadNewsCount: number;
  
  initialize: (slotId: number, date: Date, teamId: number, managerName: string, teamName: string) => Promise<void>;
  loadGame: (slotId: number) => Promise<boolean>;
  advanceDate: () => Promise<void>;
  updateLiveMatchMinute: (minute: number) => Promise<void>;
  finishLiveMatch: () => Promise<void>;
  setProcessing: (status: boolean) => void;
  setUserTeam: (teamId: number) => void;
  deleteSaveAndQuit: () => Promise<void>;
  refreshUnreadNewsCount: () => Promise<void>;
}

export const useGameStore = create<GameState>((set, get) => ({
  currentSaveId: null, currentDate: new Date('1863-09-01'), 
  season: 1, day: 1,
  isProcessing: false,
  userTeamId: null, liveMatch: null, isTampered: false, isGameOver: false,
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
      set({ 
        currentSaveId: slotId, 
        season: state.season || 1,
        day: state.day || 1,
        currentDate: state.currentDate, 
        userTeamId: state.userTeamId, 
        isProcessing: false, 
        isTampered: !isValid, 
        isGameOver: !!state.isGameOver,
        liveMatch: state.liveMatch || null
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

  updateLiveMatchMinute: async (minute: number) => {
    const { liveMatch, currentSaveId } = get();
    if (!liveMatch || !currentSaveId) return;
    const updatedMatch = { ...liveMatch, currentMinute: minute };
    await db.gameState.update(currentSaveId, { liveMatch: updatedMatch });
    set({ liveMatch: updatedMatch });
  },

  advanceDate: async () => {
    const { currentDate, day, season, userTeamId, currentSaveId, isGameOver } = get();
    if (currentSaveId === null || userTeamId === null || isGameOver) return;
    set({ isProcessing: true });

    const pendingUserMatch = await MatchService.simulateDayByDay(currentSaveId, day, userTeamId, currentDate);
    await ClubService.processDailyUpdates(userTeamId, currentSaveId, day, currentDate);
    await TrainingService.processDailyUpdates(userTeamId, currentSaveId, day, currentDate);

    await get().refreshUnreadNewsCount();

    if (pendingUserMatch) {
      const matchWithMinute = { ...pendingUserMatch, currentMinute: 0 };
      await db.gameState.update(currentSaveId, { liveMatch: matchWithMinute });
      set({ liveMatch: matchWithMinute, isProcessing: false });
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

  finishLiveMatch: async () => {
    const { liveMatch, currentSaveId, userTeamId, day, season, currentDate } = get();
    if (!liveMatch || !currentSaveId || !userTeamId) return;
    set({ isProcessing: true });
    
    const match = await db.matches.get(liveMatch.matchId);
    if (match) {
      await MatchService.saveMatchResult(match, liveMatch.result, currentSaveId, currentDate, true);
    }
    
    await db.gameState.update(currentSaveId, { liveMatch: null });

    const nextDay = day + 1;
    const nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + 1);

    const userTeam = await db.teams.get(userTeamId);
    let finalDay = nextDay;
    let finalSeason = season;

    if (userTeam) {
      const seasonEnded = await MatchService.checkSeasonEnd(currentSaveId, userTeam.leagueId);
      if (seasonEnded) {
        finalDay = 1;
        finalSeason = season + 1;
      }
    }
    
    await updateGameState(currentSaveId, userTeamId, finalDay, finalSeason, nextDate);
    await get().refreshUnreadNewsCount();
    set({ day: finalDay, season: finalSeason, currentDate: nextDate, liveMatch: null, isProcessing: false });
  },

  deleteSaveAndQuit: async () => {
    const { currentSaveId } = get();
    if (currentSaveId) {
      await db.transaction('rw', [db.players, db.teams, db.matches, db.leagues, db.saveSlots, db.gameState, db.news, db.history], async () => {
        await Promise.all([db.saveSlots.delete(currentSaveId), db.gameState.delete(currentSaveId), db.players.where('saveId').equals(currentSaveId).delete(), db.teams.where('saveId').equals(currentSaveId).delete(), db.matches.where('saveId').equals(currentSaveId).delete(), db.news.where('saveId').equals(currentSaveId).delete(), db.history.where('saveId').equals(currentSaveId).delete()]);
      });
    }
    set({ currentSaveId: null, userTeamId: null, isGameOver: false, liveMatch: null, unreadNewsCount: 0, season: 1, day: 1 });
  },

  setProcessing: (status) => set({ isProcessing: status }),
  setUserTeam: (id) => set({ userTeamId: id }),
}));

async function updateGameState(saveId: number, teamId: number, day: number, season: number, date: Date) {
  await db.gameState.update(saveId, { day, season, currentDate: date, userTeamId: teamId });
  const slot = await db.saveSlots.get(saveId);
  if (slot) await db.saveSlots.update(saveId, { day, season, lastPlayedDate: new Date() });
  const newHash = await computeSaveHash(saveId);
  await db.gameState.update(saveId, { hash: newHash });
  await BackupService.performAutoBackup(saveId);
}
