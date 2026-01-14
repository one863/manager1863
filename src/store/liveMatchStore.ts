import { db } from "@/db/db";
import { create } from "zustand";

interface LiveMatchData {
	matchId: number;
	homeTeam: any;
	awayTeam: any;
	result: any;
	currentMinute: number;
}

interface LiveMatchState {
	liveMatch: LiveMatchData | null;

	initializeLiveMatch: (
		matchId: number,
		homeTeam: any,
		awayTeam: any,
		result: any,
		saveId: number,
		startMinute?: number,
	) => Promise<void>;
	updateLiveMatchMinute: (minute: number, saveId: number) => void;
	clearLiveMatch: () => void;
}

export const useLiveMatchStore = create<LiveMatchState>((set, get) => ({
	liveMatch: null,

	initializeLiveMatch: async (
		matchId,
		homeTeam,
		awayTeam,
		result,
		saveId,
		startMinute = 0,
	) => {
		const initialData = {
			matchId,
			homeTeam,
			awayTeam,
			result,
			currentMinute: startMinute,
		};

		// Sync with persistent storage
		if (saveId) {
			await db.gameState.update(saveId, { liveMatch: initialData });
		}

		set({ liveMatch: initialData });
	},

	updateLiveMatchMinute: (minute: number, saveId: number) => {
		const { liveMatch } = get();
		if (!liveMatch) return;

		const updatedMatch = { ...liveMatch, currentMinute: minute };

		set({ liveMatch: updatedMatch });

		if (saveId) {
			db.gameState.update(saveId, { liveMatch: updatedMatch });
		}
	},

	clearLiveMatch: () => {
		set({ liveMatch: null });
	},
}));
