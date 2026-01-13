import Dexie, { Table } from 'dexie';
import { MatchResult, TeamRatings } from '@/engine/types';

// --- Interfaces ---

export interface PlayerStats {
  speed: number; strength: number; dribbling: number; shooting: number;
  defense: number; passing: number; stamina: number;
}

export interface Player {
  id?: number; saveId: number; teamId: number; firstName: string; lastName: string;
  age: number; position: 'GK' | 'DEF' | 'MID' | 'FWD'; dna: string;
  skill: number; stats: PlayerStats; energy: number; condition: number;
  morale: number; marketValue: number; wage: number; isStarter?: boolean;
}

export interface Team {
  id?: number; saveId: number; name: string; leagueId: number;
  managerName?: string; matchesPlayed?: number; points?: number;
  budget: number; reputation: number; fanCount: number; confidence: number;
  stadiumName: string; stadiumCapacity: number; stadiumLevel: number;
  sponsorName?: string; sponsorIncome?: number; sponsorExpiryDate?: Date;
  tacticType: TeamRatings['tacticType']; version: number;
  
  // NOUVEAU : Objectifs de la saison
  seasonGoal?: 'CHAMPION' | 'PROMOTION' | 'MID_TABLE' | 'AVOID_RELEGATION';
  seasonGoalStatus?: 'PENDING' | 'SUCCESS' | 'FAILED';
}

export interface League { 
  id?: number; saveId: number; name: string; level: number; 
  relegationSpots: number; promotionSpots: number;
}

export interface Match {
  id?: number; saveId: number; leagueId: number; homeTeamId: number; awayTeamId: number;
  homeScore: number; awayScore: number; date: Date; played: boolean; details?: MatchResult;
}

export interface NewsArticle {
  id?: number; saveId: number; date: Date; title: string; content: string;
  type: 'PRESS' | 'CLUB' | 'LEAGUE' | 'TRANSFER' | 'SPONSOR' | 'BOARD';
  importance: number; isRead: boolean;
}

export interface SeasonHistory {
  id?: number; saveId: number; seasonYear: number; teamId: number;
  leagueName: string; position: number; points: number; achievements: string[];
}

export interface SaveSlot {
  id?: number; managerName: string; teamName: string; currentDate: Date; lastPlayedDate: Date;
}

export interface GameStateData {
  saveId: number; currentDate: Date; userTeamId: number | null; version: number; hash?: string;
  isGameOver?: boolean; // NOUVEAU : État critique
}

// --- Base de Données ---

class Manager1863DB extends Dexie {
  players!: Table<Player>;
  teams!: Table<Team>;
  leagues!: Table<League>;
  matches!: Table<Match>;
  saveSlots!: Table<SaveSlot>;
  gameState!: Table<GameStateData>;
  news!: Table<NewsArticle>;
  history!: Table<SeasonHistory>;

  constructor() {
    super('Manager1863_Storage');

    this.version(7).stores({ // Nouvelle version pour les objectifs
      players: '++id, saveId, teamId, [saveId+teamId], [saveId+position], skill, isStarter',
      teams: '++id, saveId, leagueId, [saveId+leagueId]',
      leagues: '++id, saveId',
      matches: '++id, saveId, leagueId, date, [saveId+date], [saveId+leagueId]',
      saveSlots: 'id',
      gameState: 'saveId',
      news: '++id, saveId, date, [saveId+date]',
      history: '++id, saveId, teamId, seasonYear',
    });

    this.on('versionchange', (event) => {
      this.close();
      window.location.reload();
    });
  }
}

export const db = new Manager1863DB();
export const CURRENT_DATA_VERSION = 7;

// --- Sécurité (Identique) ---
const SALT = 'victoria-era-football-1863';
export async function computeSaveHash(saveId: number): Promise<string> {
  const state = await db.gameState.get(saveId);
  if (!state || !state.userTeamId) return '';
  const userTeam = await db.teams.get(state.userTeamId);
  if (!userTeam) return '';
  const dataToHash = JSON.stringify({
    saveId: state.saveId, date: state.currentDate.getTime(),
    teamId: state.userTeamId, points: userTeam.points || 0,
    budget: userTeam.budget, salt: SALT,
  });
  const msgUint8 = new TextEncoder().encode(dataToHash);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verifySaveIntegrity(saveId: number): Promise<boolean> {
  const state = await db.gameState.get(saveId);
  if (!state || !state.hash) return true;
  const currentHash = await computeSaveHash(saveId);
  return currentHash === state.hash;
}
