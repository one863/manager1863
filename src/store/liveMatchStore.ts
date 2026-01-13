import { create } from 'zustand';
import { db } from '@/db/db';
import { MatchService } from '@/services/match-service';
import { useGameStore } from './gameSlice';

interface LiveMatchData {
  matchId: number; 
  homeTeam: any; 
  awayTeam: any; 
  result: any;
  currentMinute: number;
}

interface LiveMatchState {
  liveMatch: LiveMatchData | null;
  
  initializeLiveMatch: (matchId: number, homeTeam: any, awayTeam: any, result: any) => Promise<void>;
  updateLiveMatchMinute: (minute: number) => void;
  clearLiveMatch: () => void;
  finishLiveMatch: () => Promise<void>;
}

export const useLiveMatchStore = create<LiveMatchState>((set, get) => ({
  liveMatch: null,

  initializeLiveMatch: async (matchId, homeTeam, awayTeam, result) => {
    const initialData = { matchId, homeTeam, awayTeam, result, currentMinute: 0 };
    
    // Sync with persistent storage (optional but good for recovery)
    const { currentSaveId } = useGameStore.getState();
    if (currentSaveId) {
      await db.gameState.update(currentSaveId, { liveMatch: initialData });
    }
    
    set({ liveMatch: initialData });
  },

  updateLiveMatchMinute: (minute: number) => {
    const { liveMatch } = get();
    if (!liveMatch) return;
    
    const updatedMatch = { ...liveMatch, currentMinute: minute };
    
    // We do NOT update DB on every minute tick to avoid IO thrashing
    // We only update local state for UI
    set({ liveMatch: updatedMatch });
  },
  
  clearLiveMatch: () => {
     set({ liveMatch: null });
  },

  finishLiveMatch: async () => {
    const { liveMatch } = get();
    const { currentSaveId, userTeamId, day, season, currentDate, refreshUnreadNewsCount } = useGameStore.getState();
    
    if (!liveMatch || !currentSaveId || !userTeamId) return;
    
    // 1. Save final result
    const match = await db.matches.get(liveMatch.matchId);
    if (match) {
      await MatchService.saveMatchResult(match, liveMatch.result, currentSaveId, currentDate, true);
    }
    
    // 2. Clear live state from DB
    await db.gameState.update(currentSaveId, { liveMatch: null });
    set({ liveMatch: null });

    // 3. Advance to next day logic (Delegated back to main store logic or handled here?)
    // To avoid circular dependency hell, it's often better to call a method on the main store
    // or replicate the simple "next day" logic.
    // Let's call a specialized method we will create in gameSlice for "postMatchCleanup"
    
    // For now, let's replicate the safe "advance day" logic without the simulation part
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
    
    // Updating main game state via DB first
    await db.gameState.update(currentSaveId, { 
      day: finalDay, 
      season: finalSeason, 
      currentDate: nextDate, 
      userTeamId: userTeamId,
      // hash will be updated by verify/load or explict call
    });
    
    // Force refresh of main store
    // We need a way to tell gameSlice "Reload your state from DB" or "Update your state"
    // The cleanest is to expose a "syncState" or "setContext" on gameSlice.
    useGameStore.setState({ 
      day: finalDay, 
      season: finalSeason, 
      currentDate: nextDate, 
      isProcessing: false 
    });
    
    await refreshUnreadNewsCount();
  },
}));
