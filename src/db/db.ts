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

export interface StaffMember {
  id?: number; saveId: number; teamId: number; name: string;
  role: 'COACH' | 'SCOUT' | 'PHYSICAL_TRAINER';
  skill: number; // 1-100
  wage: number;
}

export interface Team {
  id?: number; saveId: number; name: string; leagueId: number;
  managerName?: string; 
  presidentName?: string; 
  primaryColor?: string;  
  secondaryColor?: string; 
  matchesPlayed?: number; points?: number;
  budget: number; reputation: number; fanCount: number; confidence: number;
  stadiumName: string; stadiumCapacity: number; stadiumLevel: number;
  sponsorName?: string; sponsorIncome?: number; sponsorExpiryDate?: Date;
  tacticType: TeamRatings['tacticType']; 
  formation: '2-3-5' | '4-4-2' | '4-3-3' | '5-3-2' | '3-5-2' | '1-1-8' | '1-2-7' | '2-2-6' | 'WM'; 
  version: number;
  seasonGoal?: 'CHAMPION' | 'PROMOTION' | 'MID_TABLE' | 'AVOID_RELEGATION';
  seasonGoalStatus?: 'PENDING' | 'SUCCESS' | 'FAILED';
  
  // Suivi des travaux
  stadiumUpgradeEndDay?: number;
  stadiumProject?: {
    type: 'UPGRADE' | 'NEW_STADIUM';
    targetCapacity: number;
    targetName?: string;
  };

  trainingEndDay?: number;
  trainingFocus?: 'PHYSICAL' | 'TECHNICAL';
}

export interface League { 
  id?: number; saveId: number; name: string; level: number; 
  relegationSpots: number; promotionSpots: number;
}

export interface Match {
  id?: number; saveId: number; leagueId: number; homeTeamId: number; awayTeamId: number;
  homeScore: number; awayScore: number; date: Date; 
  day: number; 
  played: boolean; details?: MatchResult;
}

export interface NewsArticle {
  id?: number; saveId: number; day: number; 
  date: Date; title: string; content: string;
  type: 'PRESS' | 'CLUB' | 'LEAGUE' | 'TRANSFER' | 'SPONSOR' | 'BOARD';
  importance: number; isRead: boolean;
}

export interface SeasonHistory {
  id?: number; saveId: number; seasonYear: number; teamId: number;
  leagueName: string; position: number; points: number; achievements: string[];
}

export interface SaveSlot {
  id?: number; managerName: string; teamName: string; 
  presidentName?: string; 
  season: number; 
  day: number;    
  lastPlayedDate: Date;
}

export interface GameStateData {
  saveId: number; 
  season: number; 
  day: number;    
  currentDate: Date; 
  userTeamId: number | null; 
  version: number; 
  hash?: string;
  isGameOver?: boolean;
  liveMatch?: any;
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
  staff!: Table<StaffMember>;

  constructor() {
    super('Manager1863_Storage');

    // Passage à la version 15 pour optimiser les index du marché des transferts
    this.version(15).stores({
      players: '++id, saveId, teamId, [saveId+teamId], [saveId+position], [saveId+teamId+skill], skill, isStarter',
      teams: '++id, saveId, leagueId, [saveId+leagueId]',
      leagues: '++id, saveId',
      matches: '++id, saveId, leagueId, day, [saveId+day], [saveId+leagueId]',
      saveSlots: 'id, lastPlayedDate',
      gameState: 'saveId',
      news: '++id, saveId, day, [saveId+day]',
      history: '++id, saveId, teamId, seasonYear',
      staff: '++id, saveId, teamId, [saveId+teamId]'
    });

    this.on('versionchange', (event) => {
      this.close();
      window.location.reload();
    });
  }
}

export const db = new Manager1863DB();
export const CURRENT_DATA_VERSION = 15;

const SALT = 'victoria-era-football-1863';
export async function computeSaveHash(saveId: number): Promise<string> {
  const state = await db.gameState.get(saveId);
  if (!state || !state.userTeamId) return '';
  const userTeam = await db.teams.get(state.userTeamId);
  if (!userTeam) return '';
  const dataToHash = JSON.stringify({
    saveId: state.saveId, day: state.day, season: state.season,
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
