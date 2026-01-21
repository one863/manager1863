import { db } from "@/core/db/db";
import { create } from "zustand";

interface LiveMatchData {
	matchId: number;
	homeTeam: any;
	awayTeam: any;
    homePlayers: any[];
    awayPlayers: any[];
	result: any;
	currentMinute: number;
}

interface LiveMatchState {
	liveMatch: LiveMatchData | null;

	initializeLiveMatch: (
		matchId: number,
		homeTeam: any,
		awayTeam: any,
        homePlayers: any[],
        awayPlayers: any[],
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
        homePlayers,
        awayPlayers,
		result,
		saveId,
		startMinute = 0,
	) => {
		const initialData = {
			matchId,
			homeTeam,
			awayTeam,
            homePlayers,
            awayPlayers,
			result,
			currentMinute: startMinute,
		};

		if (saveId) {
			await db.gameState.where("saveId").equals(saveId).modify({ liveMatch: initialData });
		}

		set({ liveMatch: initialData });
	},

	updateLiveMatchMinute: (minute: number, saveId: number) => {
		const { liveMatch } = get();
		if (!liveMatch) return;

		const updatedMatch = { ...liveMatch, currentMinute: minute };

		set({ liveMatch: updatedMatch });

		if (saveId) {
			db.gameState.where("saveId").equals(saveId).modify({ liveMatch: updatedMatch });
		}
	},

	clearLiveMatch: () => {
		set({ liveMatch: null });
	},
}));
