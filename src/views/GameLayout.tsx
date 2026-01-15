import { verifySaveIntegrity, type Player, type StaffMember } from "@/db/db";
import { MatchService } from "@/services/match-service";
import { useGameStore } from "@/store/gameSlice";
import { useLiveMatchStore } from "@/store/liveMatchStore";
import { Loader2 } from "lucide-preact";
import { Suspense, useEffect, useRef, useState } from "preact/compat";

import { ErrorBoundary } from "@/components/Common/ErrorBoundary";
import { GameOverOverlay } from "@/components/Layout/GameOverOverlay";
import { Header } from "@/components/Layout/Header";
import { Navigation } from "@/components/Layout/Navigation";
import { SaveOverlay } from "@/components/Layout/SaveOverlay";

import PlayerCard from "@/components/PlayerCard";
import StaffCard from "@/components/StaffCard";
import ClubDetails from "@/components/ClubDetails";
import SettingsOverlay from "@/components/Layout/SettingsOverlay";
import MatchLive from "@/components/MatchLive";

import Dashboard from "@/views/Dashboard";
import TeamView from "@/views/Team/TeamView";
import LeagueView from "@/views/LeagueView";
import ClubView from "@/views/Club/ClubView";
import TransferMarket from "@/views/Transfers/TransferMarket";
import MatchReportView from "@/views/MatchReportView";

type View =
	| "dashboard"
	| "squad"
	| "league"
	| "transfers"
	| "club"
	| "match-report";

export default function GameLayout({ onQuit }: { onQuit: () => void }) {
	const [currentView, setCurrentView] = useState<View>("dashboard");
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);
	const [saveStatus, setSaveStatus] = useState<
		"idle" | "saving" | "verified" | "error"
	>("idle");
	const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);
	
	const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
	const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
	const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);

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
				onToggleMenu={() => setIsSettingsOpen(true)}
				onContinue={handleContinueClick}
			/>

			{saveStatus !== "idle" && <SaveOverlay status={saveStatus} />}

			<main
				className={`flex-1 flex flex-col ${currentView === "match-report" || currentView === "league" ? "overflow-hidden" : "overflow-y-auto"} mb-16 scroll-smooth relative`}
			>
				<ErrorBoundary>
					<Suspense fallback={<ViewLoader />}>
						{renderView(
							currentView,
							setCurrentView,
							handleSelectMatchForReport,
							selectedMatchId,
							setSelectedPlayer,
							setSelectedStaff,
							setSelectedTeamId
						)}
					</Suspense>
				</ErrorBoundary>
			</main>

			<Navigation
				currentView={currentView}
				onNavigate={(view) => setCurrentView(view)}
			/>

			{/* Global Overlays */}
			{liveMatch && <MatchLive />}
			
			{isSettingsOpen && (
				<SettingsOverlay 
					onClose={() => setIsSettingsOpen(false)} 
					onQuit={onQuit} 
				/>
			)}
			{selectedPlayer && (
				<PlayerCard 
					player={selectedPlayer} 
					onClose={() => setSelectedPlayer(null)} 
				/>
			)}
			{selectedStaff && (
				<StaffCard 
					staff={selectedStaff} 
					onClose={() => setSelectedStaff(null)} 
				/>
			)}
			{selectedTeamId && (
				<ClubDetails 
					teamId={selectedTeamId} 
					onClose={() => setSelectedTeamId(null)} 
				/>
			)}
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
	onSelectPlayer: (p: Player) => void,
	onSelectStaff: (s: StaffMember) => void,
	onSelectTeam: (id: number) => void
) {
	switch (view) {
		case "dashboard":
			return <Dashboard onNavigate={setView} onShowClub={onSelectTeam} />;
		case "squad":
			return <TeamView onSelectPlayer={onSelectPlayer} onSelectStaff={onSelectStaff} />;
		case "league":
			return <LeagueView onSelectMatch={onSelectMatch} onSelectTeam={onSelectTeam} />;
		case "transfers":
			return <TransferMarket onSelectPlayer={onSelectPlayer} onSelectStaff={onSelectStaff} />;
		case "club":
			return <ClubView />;
		case "match-report":
			return (
				<MatchReportView
					matchId={selectedMatchId!}
					onBack={() => setView("league")}
				/>
			);
		default:
			return <Dashboard onNavigate={setView} onShowClub={onSelectTeam} />;
	}
}
