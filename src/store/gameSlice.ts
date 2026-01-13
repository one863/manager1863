import { create } from 'zustand';
import { db, verifySaveIntegrity, computeSaveHash } from '@/db/db';
import { MatchService } from '@/services/match-service';
import { BackupService } from '@/services/backup-service';
import { NewsService } from '@/services/news-service';
import { repairSaveData as runDataMigrations } from '@/db/migrations/data-migrations';

interface LiveMatchData {
  matchId: number;
  homeTeam: any;
  awayTeam: any;
  result: any;
}

interface GameState {
  currentSaveId: number | null; 
  currentDate: Date;
  isProcessing: boolean;
  userTeamId: number | null;
  isTampered: boolean;
  liveMatch: LiveMatchData | null;
  
  initialize: (slotId: number, date: Date, teamId: number, managerName: string, teamName: string) => Promise<void>;
  loadGame: (slotId: number) => Promise<boolean>;
  advanceDate: () => Promise<void>;
  finishLiveMatch: () => Promise<void>; 
  setProcessing: (status: boolean) => void;
  setUserTeam: (teamId: number) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  currentSaveId: null,
  currentDate: new Date('1863-09-01'),
  isProcessing: false,
  userTeamId: null,
  liveMatch: null,
  isTampered: false,

  initialize: async (slotId, date, teamId, managerName, teamName) => {
    set({ isProcessing: true });
    
    await db.saveSlots.put({
      id: slotId,
      managerName,
      teamName,
      currentDate: date,
      lastPlayedDate: new Date()
    });

    // Initialisation du gameState sans hash d'abord
    await db.gameState.put({
      saveId: slotId,
      currentDate: date,
      userTeamId: teamId,
      version: 4, 
    });

    // Puis calcul du hash correct basé sur l'état initial réel (budget, points, etc.)
    const hash = await computeSaveHash(slotId);
    await db.gameState.update(slotId, { hash });

    await BackupService.performAutoBackup(slotId);

    set({ 
      currentSaveId: slotId,
      currentDate: date, 
      userTeamId: teamId,
      isProcessing: false,
      isTampered: false
    });
  },

  loadGame: async (slotId) => {
    set({ isProcessing: true });
    await runDataMigrations(slotId);
    
    // Vérification de l'intégrité avant chargement
    const isValid = await verifySaveIntegrity(slotId);
    const state = await db.gameState.get(slotId); 
    const slot = await db.saveSlots.get(slotId);
    
    if (state && slot) {
      const now = new Date();
      const lastPlayed = new Date(slot.lastPlayedDate);
      const diffMs = now.getTime() - lastPlayed.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

      if (diffHours > 0) {
        const allPlayers = await db.players.where('saveId').equals(slotId).toArray();
        for (const player of allPlayers) {
          if (player.energy < 100) {
            const newEnergy = Math.min(100, player.energy + (diffHours * 5));
            if (newEnergy !== player.energy) {
              await db.players.update(player.id!, { energy: newEnergy });
            }
          }
        }
      }

      await db.saveSlots.put({ ...slot, lastPlayedDate: now });

      set({ 
        currentSaveId: slotId,
        currentDate: state.currentDate, 
        userTeamId: state.userTeamId,
        isProcessing: false,
        isTampered: !isValid
      });
      return true;
    }
    set({ isProcessing: false });
    return false;
  },

  advanceDate: async () => {
    const { currentDate, userTeamId, currentSaveId } = get();
    if (currentSaveId === null || userTeamId === null) return; 

    set({ isProcessing: true });

    const pendingUserMatch = await MatchService.simulateDay(currentSaveId, currentDate, userTeamId);

    if (pendingUserMatch) {
      set({ liveMatch: pendingUserMatch, isProcessing: false });
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + 1);
      
      const allPlayers = await db.players.where('saveId').equals(currentSaveId).toArray();
      for (const player of allPlayers) {
        const newEnergy = Math.min(100, player.energy + 10);
        await db.players.update(player.id!, { energy: newEnergy });
      }

      // --- LOGIQUE DE MISE À JOUR SÉCURISÉE ---
      
      // 1. Mettre à jour la date et les points (via fin de saison possible)
      const userTeam = await db.teams.get(userTeamId);
      if (userTeam) {
        await MatchService.checkSeasonEnd(currentSaveId, userTeam.leagueId);
      }

      // 2. Appliquer les changements de date et RECALCULER LE HASH À LA FIN
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
      // Toutes les modifications (résultats, dynamique club, finances)
      await MatchService.saveMatchResult(match, liveMatch.result, currentSaveId, currentDate);
      
      const isHome = match.homeTeamId === userTeamId;
      const myTeamName = isHome ? liveMatch.homeTeam.name : liveMatch.awayTeam.name;
      const oppTeamName = isHome ? liveMatch.awayTeam.name : liveMatch.homeTeam.name;
      const myScore = isHome ? liveMatch.result.homeScore : liveMatch.result.awayScore;
      const oppScore = isHome ? liveMatch.result.awayScore : liveMatch.result.homeScore;

      await NewsService.generateMatchNews(currentSaveId, currentDate, myTeamName, oppTeamName, myScore, oppScore);
    }

    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    
    // Vérification fin de saison (qui peut modifier les points)
    const userTeam = await db.teams.get(userTeamId);
    if (userTeam) {
      await MatchService.checkSeasonEnd(currentSaveId, userTeam.leagueId);
    }

    // FINALISATION : Mise à jour date + Hash final
    await updateGameState(currentSaveId, userTeamId, newDate);

    set({ currentDate: newDate, liveMatch: null, isProcessing: false });
  },

  setProcessing: (status) => set({ isProcessing: status }),
  setUserTeam: (id) => set({ userTeamId: id }),
}));

/**
 * Met à jour l'état global et recalcule la signature numérique.
 * DOIT être appelé après toutes les autres modifications de la base de données.
 */
async function updateGameState(saveId: number, teamId: number, newDate: Date) {
  // 1. On met d'abord à jour la date et les IDs
  await db.gameState.update(saveId, { 
    currentDate: newDate, 
    userTeamId: teamId 
  });
  
  const slot = await db.saveSlots.get(saveId);
  if (slot) {
    await db.saveSlots.update(saveId, { 
      currentDate: newDate, 
      lastPlayedDate: new Date() 
    });
  }

  // 2. On calcule le hash basé sur les données RÉELLES présentes en DB à cet instant précis
  const newHash = await computeSaveHash(saveId);

  // 3. On enregistre le hash final
  await db.gameState.update(saveId, { hash: newHash });

  // 4. Backup
  await BackupService.performAutoBackup(saveId);
}
