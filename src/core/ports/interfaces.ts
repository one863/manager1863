// Interfaces clés pour une architecture hexagonale

// --- Ports de persistance (adapters) ---
export interface SavePort<T> {
  save(entity: T): Promise<void>;
  saveMany(entities: T[]): Promise<void>;
}

export interface LoadPort<T> {
  load(id: number): Promise<T | null>;
  loadAll(): Promise<T[]>;
}

// --- Exemple d'entités principales ---
export interface Player {
  id?: number;
  saveId: number;
  teamId: number;
  firstName: string;
  lastName: string;
  age: number;
  role: string;
  position: string;
  side: string;
  skill: number;
  potential: number;
  marketValue: number;
  wage: number;
  energy: number;
  morale: number;
  condition: number;
  isStarter: boolean;
  stats: any;
  traits: string[];
  joinedDay: number;
  joinedSeason: number;
  dna: string;
  injuryDays: number;
  suspensionMatches: number;
  playedThisWeek: boolean;
  lastRatings: number[];
  seasonStats: any;
}

export interface Team {
  id?: number;
  saveId: number;
  leagueId: number;
  name: string;
  reputation: number;
  budget: number;
  primaryColor: string;
  secondaryColor: string;
  stadiumName: string;
  stadiumCapacity: number;
  confidence: number;
  seasonGoal: string;
  fanCount: number;
  points: number;
  matchesPlayed: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  wins: number;
  draws: number;
  losses: number;
  tacticType: string;
  formation: string;
  version: number;
}

// --- Exemple de service métier ---
export interface PlayerService {
  createPlayer(input: Partial<Player>): Promise<Player>;
  updatePlayer(id: number, input: Partial<Player>): Promise<Player>;
  getPlayer(id: number): Promise<Player | null>;
  listPlayers(teamId?: number): Promise<Player[]>;
}

// --- Exemple d'usage ---
// Un adapter Dexie, REST ou autre implémentera SavePort<Player>, LoadPort<Player>, etc.
// Un service métier utilisera ces ports pour orchestrer la logique sans dépendre de l'infra.
