import { create } from 'zustand';
import { db, verifySaveIntegrity, computeSaveHash } from '@/db/db';
import { MatchService } from '@/services/match-service';
import { BackupService } from '@/services/backup-service';
import { repairSaveData as runDataMigrations } from '@/db/migrations/data-migrations';

interface LiveMatchData {
  matchId: number; homeTeam: any; awayTeam: any; result: any;
}

interface GameState {
  currentSaveId: number | null; currentDate: Date; isProcessing: boolean;
  userTeamId: number | null; isTampered: boolean; isGameOver: boolean;
  liveMatch: LiveMatchData | null;
  initialize: (slotId: number, date: Date, teamId: number, managerName: string, teamName: string) => Promise<void>;
  loadGame: (slotId: number) => Promise<boolean>;
  advanceDate: () => Promise<void>;
  finishLiveMatch: () => Promise<void>;
  setProcessing: (status: boolean) => void;
  setUserTeam: (teamId: number) => void;
  deleteSaveAndQuit: () => Promise<void>;
}

export const useGameStore = create<GameState>((set, get) => ({
  currentSaveId: null, currentDate: new Date('1863-09-01'), isProcessing: false,
  userTeamId: null, liveMatch: null, isTampered: false, isGameOver: false,

  initialize: async (slotId, date, teamId, managerName, teamName) => {
    set({ isProcessing: true });
    await db.saveSlots.put({ id: slotId, managerName, teamName, currentDate: date, lastPlayedDate: new Date() });
    await db.gameState.put({ saveId: slotId, currentDate: date, userTeamId: teamId, version: 7, isGameOver: false });
    const hash = await computeSaveHash(slotId);
    await db.gameState.update(slotId, { hash });
    await BackupService.performAutoBackup(slotId);
    set({ currentSaveId: slotId, currentDate: date, userTeamId: teamId, isProcessing: false, isTampered: false, isGameOver: false });
  },

  loadGame: async (slotId) => {
    set({ isProcessing: true });
    await runDataMigrations(slotId);
    const isValid = await verifySaveIntegrity(slotId);
    const state = await db.gameState.get(slotId);
    const slot = await db.saveSlots.get(slotId);
    if (state && slot) {
      set({ currentSaveId: slotId, currentDate: state.currentDate, userTeamId: state.userTeamId, isProcessing: false, isTampered: !isValid, isGameOver: !!state.isGameOver });
      return true;
    }
    set({ isProcessing: false });
    return false;
  },

  advanceDate: async () => {
    const { currentDate, userTeamId, currentSaveId, isGameOver } = get();
    if (currentSaveId === null || userTeamId === null || isGameOver) return;
    set({ isProcessing: true });
    const pendingUserMatch = await MatchService.simulateDay(currentSaveId, currentDate, userTeamId);
    if (pendingUserMatch) {
      set({ liveMatch: pendingUserMatch, isProcessing: false });
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + 1);
      const userTeam = await db.teams.get(userTeamId);
      if (userTeam) await MatchService.checkSeasonEnd(currentSaveId, userTeam.leagueId);
      await updateGameState(currentSaveId, userTeamId, newDate);
      set({ currentDate: newDate, isProcessing: false });
    }
  },

  finishLiveMatch: async () => {
    const { liveMatch, currentSaveId, userTeamId, currentDate } = get();
    if (!liveMatch || !currentSaveId || !userTeamId) return;
    set({ isProcessing: true });
    const match = await db.matches.get(liveMatch.matchId);
    if (match) {
      // APPEL UNIQUE : Gère le résultat, les news et les finances
      await MatchService.saveMatchResult(match, liveMatch.result, currentSaveId, currentDate, true);
    }
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    const userTeam = await db.teams.get(userTeamId);
    if (userTeam) await MatchService.checkSeasonEnd(currentSaveId, userTeam.leagueId);
    await updateGameState(currentSaveId, userTeamId, newDate);
    set({ currentDate: newDate, liveMatch: null, isProcessing: false });
  },

  deleteSaveAndQuit: async () => {
    const { currentSaveId } = get();
    if (currentSaveId) {
      await db.transaction('rw', [db.players, db.teams, db.matches, db.leagues, db.saveSlots, db.gameState, db.news, db.history], async () => {
        await Promise.all([db.saveSlots.delete(currentSaveId), db.gameState.delete(currentSaveId), db.players.where('saveId').equals(currentSaveId).delete(), db.teams.where('saveId').equals(currentSaveId).delete(), db.matches.where('saveId').equals(currentSaveId).delete(), db.news.where('saveId').equals(currentSaveId).delete(), db.history.where('saveId').equals(currentSaveId).delete()]);
      });
    }
    set({ currentSaveId: null, userTeamId: null, isGameOver: false });
  },

  setProcessing: (status) => set({ isProcessing: status }),
  setUserTeam: (id) => set({ userTeamId: id }),
}));

async function updateGameState(saveId: number, teamId: number, newDate: Date) {
  await db.gameState.update(saveId, { currentDate: newDate, userTeamId: teamId });
  const slot = await db.saveSlots.get(saveId);
  if (slot) await db.saveSlots.update(saveId, { currentDate: newDate, lastPlayedDate: new Date() });
  const newHash = await computeSaveHash(saveId);
  await db.gameState.update(saveId, { hash: newHash });
  await BackupService.performAutoBackup(saveId);
}
