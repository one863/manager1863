import { computeSaveHash, db, verifySaveIntegrity } from "@/db/db";
import { repairSaveData as runDataMigrations } from "@/db/migrations/data-migrations";
import { BackupService } from "@/services/backup-service";
import { ClubService } from "@/services/club-service";
import { MatchService } from "@/services/match-service";
import { NewsService } from "@/services/news-service";
import { TrainingService } from "@/services/training-service";
import { create } from "zustand";
import { useLiveMatchStore } from "./liveMatchStore";

interface GameState {
	currentSaveId: number | null;
	currentDate: Date;
	season: number;
	day: number;
	isProcessing: boolean;
	userTeamId: number | null;
	isTampered: boolean;
	isGameOver: boolean;
	unreadNewsCount: number;

	initialize: (
		slotId: number,
		date: Date,
		teamId: number,
		managerName: string,
		teamName: string,
	) => Promise<void>;
	loadGame: (slotId: number) => Promise<boolean>;
	advanceDate: () => Promise<void>;
	setProcessing: (status: boolean) => void;
	setUserTeam: (teamId: number) => void;
	deleteSaveAndQuit: () => Promise<void>;
	refreshUnreadNewsCount: () => Promise<void>;
	finalizeLiveMatch: () => Promise<void>;
}

export const useGameStore = create<GameState>((set, get) => ({
	currentSaveId: null,
	currentDate: new Date("1863-09-01"),
	season: 1,
	day: 1,
	isProcessing: false,
	userTeamId: null,
	isTampered: false,
	isGameOver: false,
	unreadNewsCount: 0,

	initialize: async (slotId, date, teamId, _managerName, _teamName) => {
		// SECURITY: Ensure any residual live match state is cleared when starting fresh
		useLiveMatchStore.getState().clearLiveMatch();

		set({
			currentSaveId: slotId,
			season: 1,
			day: 1,
			currentDate: date,
			userTeamId: teamId,
			isProcessing: false,
			isTampered: false,
			isGameOver: false,
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
			if (state.liveMatch) {
				useLiveMatchStore
					.getState()
					.initializeLiveMatch(
						state.liveMatch.matchId,
						state.liveMatch.homeTeam,
						state.liveMatch.awayTeam,
						state.liveMatch.result,
						slotId,
						state.liveMatch.currentMinute,
					);
			} else {
				useLiveMatchStore.getState().clearLiveMatch();
			}

			set({
				currentSaveId: slotId,
				season: state.season || 1,
				day: state.day || 1,
				currentDate: state.currentDate,
				userTeamId: state.userTeamId,
				isProcessing: false,
				isTampered: !isValid,
				isGameOver: !!state.isGameOver,
			});
			await get().refreshUnreadNewsCount();
			return true;
		}
		set({ isProcessing: false });
		return false;
	},

	refreshUnreadNewsCount: async () => {
		const { currentSaveId, day } = get();
		if (!currentSaveId) return;

		const unreadNews = await db.news
			.where("saveId")
			.equals(currentSaveId)
			.and((n) => !n.isRead)
			.toArray();
		const visibleUnreadCount = unreadNews.filter((n) => n.day <= day).length;

		set({ unreadNewsCount: visibleUnreadCount });
	},

	advanceDate: async () => {
		const { currentDate, day, season, userTeamId, currentSaveId, isGameOver } =
			get();
		if (currentSaveId === null || userTeamId === null || isGameOver) return;
		set({ isProcessing: true });

		const nextDay = day + 1;
		const nextDate = new Date(currentDate);
		nextDate.setDate(nextDate.getDate() + 1);

		const pendingUserMatch = await MatchService.simulateDayByDay(
			currentSaveId,
			day,
			userTeamId,
			currentDate,
		);

		await Promise.all([
			ClubService.processDailyUpdates(
				userTeamId,
				currentSaveId,
				nextDay,
				nextDate,
			),
			TrainingService.processDailyUpdates(
				userTeamId,
				currentSaveId,
				nextDay,
				nextDate,
			),
			NewsService.processDailyNews(
				currentSaveId,
				nextDay,
				nextDate,
				userTeamId,
			),
		]);

		if (day % 30 === 0) {
			await NewsService.cleanupOldNews(currentSaveId, season);
		}

		if (pendingUserMatch) {
			await useLiveMatchStore
				.getState()
				.initializeLiveMatch(
					pendingUserMatch.matchId,
					pendingUserMatch.homeTeam,
					pendingUserMatch.awayTeam,
					pendingUserMatch.result,
					currentSaveId,
				);
			set({ isProcessing: false });
			await get().refreshUnreadNewsCount();
		} else {
			const userTeam = await db.teams.get(userTeamId);
			if (userTeam) {
				const seasonEnded = await MatchService.checkSeasonEnd(
					currentSaveId,
					userTeam.leagueId,
				);
				if (seasonEnded) {
					const nextSeason = season + 1;
					await updateGameState(
						currentSaveId,
						userTeamId,
						1,
						nextSeason,
						nextDate,
					);
					set({
						day: 1,
						season: nextSeason,
						currentDate: nextDate,
						isProcessing: false,
					});
					await get().refreshUnreadNewsCount();
					return;
				}
			}

			await updateGameState(
				currentSaveId,
				userTeamId,
				nextDay,
				season,
				nextDate,
			);
			set({ day: nextDay, currentDate: nextDate, isProcessing: false });
			await get().refreshUnreadNewsCount();
		}
	},

	finalizeLiveMatch: async () => {
		const { currentSaveId, userTeamId, day, season, currentDate } = get();
		const liveMatch = useLiveMatchStore.getState().liveMatch;

		if (!liveMatch || !currentSaveId || !userTeamId) return;

		// 1. Save final result
		const match = await db.matches.get(liveMatch.matchId);
		if (match) {
			await MatchService.saveMatchResult(
				match,
				liveMatch.result,
				currentSaveId,
				currentDate,
				true,
			);
		}

		// 2. Clear live state from DB and Store
		await db.gameState.update(currentSaveId, { liveMatch: null });
		useLiveMatchStore.getState().clearLiveMatch();

		// 3. Advance to next day logic
		const nextDay = day + 1;
		const nextDate = new Date(currentDate);
		nextDate.setDate(nextDate.getDate() + 1);

		const userTeam = await db.teams.get(userTeamId);
		let finalDay = nextDay;
		let finalSeason = season;

		if (userTeam) {
			const seasonEnded = await MatchService.checkSeasonEnd(
				currentSaveId,
				userTeam.leagueId,
			);
			if (seasonEnded) {
				finalDay = 1;
				finalSeason = season + 1;
			}
		}

		await updateGameState(
			currentSaveId,
			userTeamId,
			finalDay,
			finalSeason,
			nextDate,
		);

		set({
			day: finalDay,
			season: finalSeason,
			currentDate: nextDate,
			isProcessing: false,
		});

		await get().refreshUnreadNewsCount();
	},

	deleteSaveAndQuit: async () => {
		const { currentSaveId } = get();
		if (currentSaveId) {
			await db.transaction(
				"rw",
				[
					db.players,
					db.teams,
					db.matches,
					db.leagues,
					db.saveSlots,
					db.gameState,
					db.news,
					db.history,
				],
				async () => {
					await Promise.all([
						db.saveSlots.delete(currentSaveId),
						db.gameState.delete(currentSaveId),
						db.players.where("saveId").equals(currentSaveId).delete(),
						db.teams.where("saveId").equals(currentSaveId).delete(),
						db.matches.where("saveId").equals(currentSaveId).delete(),
						db.news.where("saveId").equals(currentSaveId).delete(),
						db.history.where("saveId").equals(currentSaveId).delete(),
					]);
				},
			);
		}
		// Security clear
		useLiveMatchStore.getState().clearLiveMatch();
		set({
			currentSaveId: null,
			userTeamId: null,
			isGameOver: false,
			unreadNewsCount: 0,
			season: 1,
			day: 1,
		});
	},

	setProcessing: (status) => set({ isProcessing: status }),
	setUserTeam: (id) => set({ userTeamId: id }),
}));

async function updateGameState(
	saveId: number,
	teamId: number,
	day: number,
	season: number,
	date: Date,
) {
	await db.gameState.update(saveId, {
		day,
		season,
		currentDate: date,
		userTeamId: teamId,
	});
	const slot = await db.saveSlots.get(saveId);
	if (slot)
		await db.saveSlots.update(saveId, {
			day,
			season,
			lastPlayedDate: new Date(),
		});

	const state = await db.gameState.get(saveId);
	if (state?.userTeamId) {
		const userTeam = await db.teams.get(state.userTeamId);
		if (userTeam) {
			const newHash = await computeSaveHash(saveId);
			await db.gameState.update(saveId, { hash: newHash });
		}
	}

	await BackupService.performAutoBackup(saveId);
}
