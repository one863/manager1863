import { db, persistStorage } from "@/core/db/db";
import { useGameStore } from "@/infrastructure/store/gameSlice";
import { Suspense } from "preact/compat";
import { useEffect, useState } from "preact/hooks";

import MainMenu from "@/ui/screens/MainMenu";
import GameLayout from "@/ui/layouts/GameLayout";
import CreateTeam from "@/ui/screens/CreateTeam";
import LoadGame from "@/ui/screens/LoadGame";
import { BackupService } from "@/core/services/backup-service";

type AppState = "menu" | "create" | "load" | "game" | "initializing";

const LoadingScreen = () => (
	<div className="h-screen bg-paper flex items-center justify-center font-serif italic text-ink-light">
		Chargement...
	</div>
);

export function App() {
	const [appState, setAppState] = useState<AppState>("initializing");
	const currentSaveId = useGameStore((state) => state.currentSaveId);
	const loadGame = useGameStore((state) => state.loadGame);

	useEffect(() => {
		const restoreSession = async () => {
            try { await persistStorage(); } catch (e) {}
            BackupService.clearOldLocalStorageBackups();

			try {
				const lastSave = await db.saveSlots.orderBy("lastPlayedDate").last();
				if (lastSave && lastSave.id !== undefined) {
					const success = await loadGame(lastSave.id);
					if (success) {
						setAppState("game");
						return;
					}
				}
			} catch (e) {}
			setAppState("menu");
		};

		restoreSession();
	}, []);

	useEffect(() => {
		if (currentSaveId && (appState === "menu" || appState === "initializing")) {
			setAppState("game");
		}
	}, [currentSaveId, appState]);

	const handleNewGameClick = () => setAppState("create");
	const handleGameCreated = () => setAppState("game");
	const handleLoadGameClick = () => setAppState("load");
	const handleCancel = () => setAppState("menu");
	const handleQuit = () => setAppState("menu");

	const handleGameLoaded = async (slotId: number) => {
		const success = await loadGame(slotId);
		if (success) setAppState("game");
		else alert("Erreur lors du chargement de la sauvegarde !");
	};

	if (appState === "initializing") {
		return <div className="h-screen bg-paper flex items-center justify-center font-serif italic text-ink-light">Chargement...</div>;
	}

	return (
		<Suspense fallback={<LoadingScreen />}>
			{appState === "menu" && (
				<MainMenu
					onNewGame={handleNewGameClick}
					onLoadGame={handleLoadGameClick}
				/>
			)}
			{appState === "create" && (
				<CreateTeam onGameCreated={handleGameCreated} onCancel={handleCancel} />
			)}
			{appState === "load" && (
				<LoadGame onGameLoaded={handleGameLoaded} onCancel={handleCancel} />
			)}
			{appState === "game" && <GameLayout onQuit={handleQuit} />}
		</Suspense>
	);
}
