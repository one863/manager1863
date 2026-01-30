import { verifySaveIntegrity, type Player, type StaffMember, computeSaveHash, db } from "@/core/db/db";
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
import NewsView from "@/news/feed/NewsList";

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
	| "live-match"
    | "news-details";

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
	const currentSaveId = useGameStore((state) => state.currentSaveId);
	const isProcessing = useGameStore((state) => state.isProcessing);
	const isGameOver = useGameStore((state) => state.isGameOver);
	const advanceDate = useGameStore((state) => state.advanceDate);
    
    const pushView = useGameStore((state) => state.pushView);
    const popView = useGameStore((state) => state.popView);

	const liveMatch = useLiveMatchStore((state) => state.liveMatch);

	useEffect(() => {
		// Ne change la vue que si on n'est pas déjà en live-match
		if (liveMatch && currentView !== "live-match" && currentView !== "match-report") {
			setCurrentView("live-match");
		}
	}, [liveMatch, currentView]);

	const handleContinueClick = async () => {
		if (isGameOver || isProcessing) return;

        if (currentView === "match-report") {
            setCurrentView("dashboard");
            return;
        }

		executeContinue();
	};

	const ADVANCE_TIMEOUT = 45000; // Timeout ajustable (ms)
	const executeContinue = async () => {
		setSaveStatus("saving");

		const watchdog = setTimeout(() => {
			setSaveStatus("idle");
			console.error("WATCHDOG: Advance date too long, unlocking UI");
		}, ADVANCE_TIMEOUT);

		console.time('Simulate');
		try {
			await advanceDate();
			const liveMatch = useLiveMatchStore.getState().liveMatch;
			if (liveMatch && liveMatch.matchId !== null && liveMatch.matchId !== undefined) {
				setCurrentView("live-match");
			} else {
				if (liveMatch && (liveMatch.matchId === null || liveMatch.matchId === undefined)) {
					console.warn("Aucun match utilisateur à jouer aujourd'hui, passage direct au dashboard.");
				}
				setCurrentView("dashboard");
			}
		} catch (error) {
			console.error("Simulation error:", error);
			setSaveStatus("error");
		} finally {
			console.timeEnd('Simulate');
			clearTimeout(watchdog);
			setSaveStatus("idle");
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

    const handleShowReportAfterLive = (matchId: number) => {
        setSelectedMatchId(matchId);
        setCurrentView("match-report");
    };

	const handleCloseDetailView = () => {
        const last = popView();
		if (last) {
			setCurrentView(last.view as View);
		} else {
			setCurrentView("dashboard");
		}
	};

    const isLive = currentView === "live-match";

	return (
		<div className="flex flex-col h-screen max-w-md mx-auto bg-slate-50 border-x border-slate-200 shadow-xl overflow-hidden relative font-sans">
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
				className={`flex-1 flex flex-col ${["match-report", "league", "live-match"].includes(currentView) ? "overflow-hidden" : "overflow-y-auto"} ${!isLive ? "mb-16" : ""} scroll-smooth relative bg-slate-50`}
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
							selectedTeamId,
                            handleShowReportAfterLive
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

			{(saveStatus === "saving" || isProcessing) && (
				<div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-50/80 backdrop-blur-sm transition-all duration-300">
					<div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center max-w-[80%] text-center">
						<Loader2 size={32} className="text-slate-600 animate-spin mb-4" />
						<p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
							Sauvegarde en cours...
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
			<Loader2 size={32} className="text-slate-600 animate-spin mb-2" />
			<p className="text-slate-600 text-[10px] font-black uppercase tracking-widest">
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
	selectedTeamId: number | null,
    onShowReportAfterLive: (id: number) => void
) {
	switch (view) {
		case "dashboard":
			return <Dashboard onNavigate={(v) => v === 'news' ? setView('news-details') : setView(v as View)} onShowClub={onSelectTeam} onSelectPlayer={onSelectPlayer} />;
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
			return <MatchLive onShowReport={onShowReportAfterLive} />;
        case "news-details":
            return <NewsView onNavigate={setView} onSelectPlayer={onSelectPlayer} onSelectTeam={onSelectTeam} onClose={onCloseDetail} />;
		default:
			return <Dashboard onNavigate={(v) => v === 'news' ? setView('news-details') : setView(v as View)} onShowClub={onSelectTeam} onSelectPlayer={onSelectPlayer} />;
	}
}
