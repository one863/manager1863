import { create } from "zustand";

// Ce store gère l'état de l'interface liée aux joueurs (filtres, sélections)
// Les données brutes des joueurs restent dans Dexie
interface PlayerUIState {
	selectedPlayerId: number | null;
	filterTeamId: number | null;

	selectPlayer: (id: number | null) => void;
	setTeamFilter: (id: number | null) => void;
}

export const usePlayerStore = create<PlayerUIState>((set) => ({
	selectedPlayerId: null,
	filterTeamId: null,

	selectPlayer: (id) => set({ selectedPlayerId: id }),
	setTeamFilter: (id) => set({ filterTeamId: id }),
}));
