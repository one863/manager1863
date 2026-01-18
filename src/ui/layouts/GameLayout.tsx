import { verifySaveIntegrity, type Player, type StaffMember } from "@/core/db/db";
import { useGameStore } from "@/infrastructure/store/gameSlice";
import { useLiveMatchStore } from "@/infrastructure/store/liveMatchStore";
import { Loader2 } from "lucide-preact";
import { Suspense, useState, useEffect } from "preact/compat";
import { useTranslation } from "react-i18next";

import { ErrorBoundary } from "@/ui/components/Common/ErrorBoundary";
import { Header } from "@/ui/components/Layout/Header";
import { Navigation } from "@/ui/components/Layout/Navigation";

import PlayerCard from "@/squad/components/PlayerCard";
import StaffCard from "@/squad/components/StaffCard";
import ClubDetails from "@/club/components/ClubDetails";
import ManagerView from "@/ui/components/Layout/ManagerView";
import MatchLive from "@/competition/match/MatchLive";

import Dashboard from "@/dashboard/DashboardView";
import SquadView from "@/squad/SquadView";
import LeagueView from "@/competition/league/LeagueView";
import ClubView from "@/club/ClubView";
import TransferMarket from "@/market/transfers/TransferMarket";
import MatchReportView from "@/competition/match/MatchReportView";

type View =
	| "dashboard"
	| "squad"
	| "league"
	| "transfers"
	| "club"
	| "match-report"
	| "player-details"
	| "staff-details"
	| "team-details"
	| "manager"
	| "live-match";

export default function GameLayout({ onQuit }: { onQuit: () => void }) {
	const { t } = useTranslation();
	const [currentView, setCurrentView] = useState<View>("dashboard");
	
	const [saveStatus, setSaveStatus] = useState<
		"idle" | "saving" | "verified" | "error"
	>("idle");
	const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);
	
	const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
	const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
	const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);

	const currentDate = useGameStore((state) => state.currentDate);
	const day = useGameStore((state) => state.day);
	const currentSaveId = useGameStore((state) => state.currentSaveId);
	const isProcessing = useGameStore((state) => state.isProcessing);
	const isGameOver = useGameStore((state) => state.isGameOver);
	const advanceDate = useGameStore((state) => state.advanceDate);
	const finalizeLiveMatch = useGameStore((state) => state.finalizeLiveMatch);
    
    const pushView = useGameStore((state) => state.pushView);
    const popView = useGameStore((state) => state.popView);
    const setUIContext = useGameStore((state) => state.setUIContext);

	const liveMatch = useLiveMatchStore((state) => state.liveMatch);

	// Effect to switch to live-match view when a match starts
	useEffect(() => {
		if (liveMatch && currentView !== "live-match") {
			setCurrentView("live-match");
		} else if (!liveMatch && currentView === "live-match") {
			// When match ends (liveMatch becomes null), redirect to league view
			setCurrentView("league");
		}
	}, [liveMatch]);

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
				setCurrentView("live-match");
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

	const navigateToView = (view: View) => {
		pushView(currentView);
		setCurrentView(view);
	};

	const handleSelectPlayer = (player: Player) => {
		setSelectedPlayer(player);
		navigateToView("player-details");
	};

	const handleSelectStaff = (staff: StaffMember) => {
		setSelectedStaff(staff);
        // Si on vient d'une vue qui a des onglets, on s'assure que le contexte est bon
        if (currentView === "squad") setUIContext("squad", "staff");
        if (currentView === "transfers") setUIContext("transfers", "staff");
		navigateToView("staff-details");
	};

	const handleSelectTeam = (id: number) => {
		setSelectedTeamId(id);
		navigateToView("team-details");
	};

	const handleSelectMatchForReport = (id: number) => {
		setSelectedMatchId(id);
		navigateToView("match-report");
	};

	const handleCloseDetailView = () => {
        const last = popView();
		if (last && last.view !== "live-match") {
			setCurrentView(last.view as View);
		} else {
			setCurrentView("dashboard");
		}
	};

    const isLive = currentView === "live-match";

	return (
		<div className="flex flex-col h-screen max-w-md mx-auto bg-white border-x border-gray-100 shadow-xl overflow-hidden relative">
			{!isLive && (
                <Header
                    currentDate={currentDate}
                    isProcessing={isProcessing}
                    showOverlay={saveStatus !== "idle"}
                    onToggleMenu={() => navigateToView("manager")}
                    onContinue={handleContinueClick}
                    onGoToDashboard={() => setCurrentView("dashboard")}
                />
            )}

			<main
				className={`flex-1 flex flex-col ${["match-report", "league", "live-match"].includes(currentView) ? "overflow-hidden" : "overflow-y-auto"} ${!isLive ? "mb-16" : ""} scroll-smooth relative bg-white`}
			>
				<ErrorBoundary>
					<Suspense fallback={<ViewLoader />}>
						{renderView(
							currentView,
							setCurrentView,
							handleSelectMatchForReport,
							selectedMatchId,
							handleSelectPlayer,
							handleSelectStaff,
							handleSelectTeam,
							onQuit,
							handleCloseDetailView,
							selectedPlayer,
							selectedStaff,
							selectedTeamId
						)}
					</Suspense>
				</ErrorBoundary>
			</main>

			{!isLive && (
                <Navigation
                    currentView={currentView}
                    onNavigate={(view) => setCurrentView(view as View)}
                />
            )}

			{saveStatus !== "idle" && (
				<div className="fixed inset-0 z-[500] flex items-center justify-center bg-white/80 backdrop-blur-sm">
					<div className="flex flex-col items-center">
						<Loader2 size={40} className="text-blue-600 animate-spin mb-4" />
						<p className="text-sm font-black uppercase tracking-widest text-blue-600">
							{saveStatus === "saving" ? t("dashboard.day", { day: day + 1 }) : "Synchronisé"}
						</p>
					</div>
				</div>
			)}
		</div>
	);
}

function ViewLoader() {
	return (
		<div className="flex flex-col items-center justify-center h-full">
			<Loader2 size={32} className="text-blue-600 animate-spin mb-2" />
			<p className="text-gray-400 text-xs font-bold uppercase tracking-widest">
				Chargement...
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
	onSelectTeam: (id: number) => void,
	onQuit: () => void,
	onCloseDetail: () => void,
	selectedPlayer: Player | null,
	selectedStaff: StaffMember | null,
	selectedTeamId: number | null
) {
	switch (view) {
		case "dashboard":
			return <Dashboard onNavigate={setView} onShowClub={onSelectTeam} onSelectPlayer={onSelectPlayer} />;
		case "squad":
			return <SquadView onSelectPlayer={onSelectPlayer} onSelectStaff={onSelectStaff} />;
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
					onBack={onCloseDetail}
				/>
			);
		case "player-details":
			return <PlayerCard player={selectedPlayer} onClose={onCloseDetail} />;
		case "staff-details":
			return <StaffCard staff={selectedStaff} onClose={onCloseDetail} />;
		case "team-details":
			return <ClubDetails teamId={selectedTeamId!} onClose={onCloseDetail} onSelectPlayer={onSelectPlayer} />;
		case "manager":
			return <ManagerView onClose={onCloseDetail} onQuit={onQuit} />;
		case "live-match":
			return <MatchLive />;
		default:
			return <Dashboard onNavigate={setView} onShowClub={onSelectTeam} onSelectPlayer={onSelectPlayer} />;
	}
}
