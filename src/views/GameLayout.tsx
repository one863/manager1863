import { verifySaveIntegrity } from "@/db/db";
import { MatchService } from "@/services/match-service";
import { useGameStore } from "@/store/gameSlice";
import { useLiveMatchStore } from "@/store/liveMatchStore";
import { Loader2 } from "lucide-preact";
import { Suspense, lazy, useEffect, useRef, useState } from "preact/compat";

import { ErrorBoundary } from "@/components/Common/ErrorBoundary";
import { GameOverOverlay } from "@/components/Layout/GameOverOverlay";
import { Header } from "@/components/Layout/Header";
import { Navigation } from "@/components/Layout/Navigation";
import { SaveOverlay } from "@/components/Layout/SaveOverlay";
import { SidebarMenu } from "@/components/Layout/SidebarMenu";

const Dashboard = lazy(() => import("@/views/Dashboard"));
const Squad = lazy(() => import("@/views/Squad"));
const LeagueView = lazy(() => import("@/views/LeagueView"));
const MatchLive = lazy(() => import("@/components/MatchLive"));
const Training = lazy(() => import("@/views/Training"));
const NewsList = lazy(() => import("@/views/News/NewsList"));
const TransferMarket = lazy(() => import("@/views/Transfers/TransferMarket"));
const ClubManagement = lazy(() => import("@/views/Club/ClubManagement"));
const SponsorsFinances = lazy(() => import("@/views/Club/SponsorsFinances"));
const MatchReportView = lazy(() => import("@/views/MatchReportView"));

type View =
	| "dashboard"
	| "squad"
	| "league"
	| "training"
	| "news"
	| "transfers"
	| "club"
	| "finances"
	| "match-report";

export default function GameLayout({ onQuit }: { onQuit: () => void }) {
	const [currentView, setCurrentView] = useState<View>("dashboard");
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [saveStatus, setSaveStatus] = useState<
		"idle" | "saving" | "verified" | "error"
	>("idle");
	const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);

	const currentDate = useGameStore((state) => state.currentDate);
	const currentSaveId = useGameStore((state) => state.currentSaveId);
	const userTeamId = useGameStore((state) => state.userTeamId);
	const isProcessing = useGameStore((state) => state.isProcessing);
	const isGameOver = useGameStore((state) => state.isGameOver);
	const advanceDate = useGameStore((state) => state.advanceDate);
	const deleteSaveAndQuit = useGameStore((state) => state.deleteSaveAndQuit);
	const finalizeLiveMatch = useGameStore((state) => state.finalizeLiveMatch);

	const liveMatch = useLiveMatchStore((state) => state.liveMatch);

	const handleContinueClick = async () => {
		const liveState = useLiveMatchStore.getState();
		if (liveState.liveMatch) {
			if (liveState.liveMatch.currentMinute >= 90) {
				await finalizeLiveMatch();
			}
			return;
		}

		if (isGameOver || isProcessing) return;

		executeContinue();
	};

	const executeContinue = async () => {
		try {
			setSaveStatus("saving");
			await new Promise((resolve) => setTimeout(resolve, 300));
			await advanceDate();

			if (currentSaveId) {
				const isValid = await verifySaveIntegrity(currentSaveId);
				setSaveStatus(isValid ? "verified" : "error");
				if (isValid) await new Promise((resolve) => setTimeout(resolve, 500));
			}

			if (useLiveMatchStore.getState().liveMatch) {
				setSaveStatus("idle");
				return;
			}
			setCurrentView("dashboard");
		} catch (error) {
			console.error("Simulation error:", error);
			setSaveStatus("error");
		} finally {
			setTimeout(() => setSaveStatus("idle"), 300);
		}
	};

	const handleRestart = async () => {
		await deleteSaveAndQuit();
		onQuit();
	};

	const handleSelectMatchForReport = (id: number) => {
		setSelectedMatchId(id);
		setCurrentView("match-report");
	};

	return (
		<div className="flex flex-col h-screen max-w-md mx-auto bg-paper border-x border-paper-dark shadow-2xl overflow-hidden relative">
			{isGameOver && <GameOverOverlay onRestart={handleRestart} />}

			<Header
				currentDate={currentDate}
				isProcessing={isProcessing}
				showOverlay={saveStatus !== "idle"}
				isMenuOpen={isMenuOpen}
				onToggleMenu={() => setIsMenuOpen(!isMenuOpen)}
				onContinue={handleContinueClick}
			/>

			{saveStatus !== "idle" && <SaveOverlay status={saveStatus} />}

			{isMenuOpen && (
				<SidebarMenu
					currentView={currentView}
					onNavigate={(view) => {
						setCurrentView(view);
						setIsMenuOpen(false);
					}}
					onQuit={onQuit}
					onClose={() => setIsMenuOpen(false)}
				/>
			)}

			<main
				className={`flex-1 flex flex-col ${liveMatch ? "overflow-hidden p-0" : currentView === "match-report" || currentView === "league" ? "overflow-hidden p-0" : "overflow-y-auto p-4"} mb-16 scroll-smooth relative`}
			>
				<ErrorBoundary>
					<Suspense fallback={<ViewLoader />}>
						{liveMatch ? (
							<MatchLive />
						) : (
							renderView(
								currentView,
								setCurrentView,
								handleSelectMatchForReport,
								selectedMatchId,
							)
						)}
					</Suspense>
				</ErrorBoundary>
			</main>

			<Navigation
				currentView={currentView}
				onNavigate={(view) => setCurrentView(view)}
			/>
		</div>
	);
}

function ViewLoader() {
	return (
		<div className="flex flex-col items-center justify-center h-full animate-pulse">
			<Loader2 size={32} className="text-black animate-spin mb-2" />
			<p className="text-ink-light text-xs italic font-serif">
				Déploiement des archives...
			</p>
		</div>
	);
}

function renderView(
	view: View,
	setView: (v: View) => void,
	onSelectMatch: (id: number) => void,
	selectedMatchId: number | null,
) {
	switch (view) {
		case "dashboard":
			return <Dashboard onNavigate={setView} />;
		case "squad":
			return <Squad />;
		case "league":
			return <LeagueView onSelectMatch={onSelectMatch} />;
		case "training":
			return <Training />;
		case "news":
			return <NewsList onNavigate={setView} />;
		case "transfers":
			return <TransferMarket />;
		case "club":
			return <ClubManagement />;
		case "finances":
			return <SponsorsFinances />;
		case "match-report":
			return (
				<MatchReportView
					matchId={selectedMatchId!}
					onBack={() => setView("league")}
				/>
			);
		default:
			return <Dashboard onNavigate={setView} />;
	}
}
