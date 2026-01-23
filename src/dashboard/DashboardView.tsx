import { type League, type Match, type Team, type StaffMember, db, Player } from "@/core/db/db";
import { useGameStore } from "@/infrastructure/store/gameSlice";
import { useEffect, useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import NewsList from "@/news/feed/NewsList";
import { SubTabs } from "@/ui/components/Common/SubTabs";
import ClubIdentityCard from "@/ui/components/Dashboard/ClubIdentityCard";
import NextMatchCard from "@/ui/components/Dashboard/NextMatchCard";
import BoardView from "@/club/personnel/BoardView";
import { TacticType, StrategyType } from "@/core/types";

export default function Dashboard({
	onNavigate,
	onShowClub,
	onSelectPlayer,
}: { onNavigate?: (view: any) => void; onShowClub?: (id: number) => void; onSelectPlayer?: (p: Player) => void }) {
	const { t } = useTranslation();
	const currentSaveId = useGameStore((state) => state.currentSaveId);
	const userTeamId = useGameStore((state) => state.userTeamId);
	const day = useGameStore((state) => state.day);
	const currentDate = useGameStore((state) => state.currentDate);
	const unreadNewsCount = useGameStore((state) => state.unreadNewsCount);
    const activeTab = useGameStore((state) => (state.uiContext.dashboard as "club" | "board" | "news") || "club");
    const setUIContext = useGameStore((state) => state.setUIContext);

	const [team, setTeam] = useState<Team | null>(null);
	const [league, setLeague] = useState<League | null>(null);
	const [coach, setCoach] = useState<StaffMember | null>(null);
	const [nextMatch, setNextMatch] = useState<{
		match: Match;
		opponent: Team;
		opponentRank?: number;
	} | null>(null);
	const [userForm, setUserForm] = useState<Match[]>([]);
	const [opponentForm, setOpponentForm] = useState<Match[]>([]);
	const [position, setPosition] = useState<number>(0);
	const [isLoading, setIsLoading] = useState(true);

	const tabs = [
		{ id: "club", label: t("dashboard.club_tab", "Overview") },
		{ id: "board", label: t("club.board_tab", "Board") },
		{ id: "news", label: t("dashboard.news_tab", "Actus"), badge: unreadNewsCount },
	];

	useEffect(() => {
		const loadDashboardData = async () => {
			if (currentSaveId === null || userTeamId === null) return;
			try {
				const [userTeam, userCoach] = await Promise.all([
					db.teams.get(userTeamId),
					db.staff.where("[saveId+teamId]").equals([currentSaveId, userTeamId]).first(),
				]);
				
                // Conversion explicite pour le type TacticType
                if (userTeam && !userTeam.tacticType) {
                    userTeam.tacticType = "NORMAL" as TacticType;
                }

				setTeam(userTeam || null);
				setCoach(userCoach || null);

				if (userTeam) {
					const userLeague = await db.leagues.get(userTeam.leagueId);
					setLeague(userLeague || null);
					
					const leagueTeams = await db.teams
						.where("leagueId")
						.equals(userTeam.leagueId)
						.toArray();
					leagueTeams.sort((a, b) => (b.points || 0) - (a.points || 0) || (b.goalDifference || 0) - (a.goalDifference || 0));
					setPosition(leagueTeams.findIndex((t) => t.id === userTeamId) + 1);

					// Get user form - SAFE QUERY
					const userRecent = await db.matches
						.where("saveId")
						.equals(currentSaveId)
						.filter(m => m.played === true && (m.homeTeamId === userTeamId || m.awayTeamId === userTeamId))
						.toArray();
					setUserForm(userRecent.sort((a, b) => b.day - a.day).slice(0, 5).reverse());

					// Get next match - SAFE QUERY
					const futureMatches = await db.matches
						.where("[saveId+day]")
						.between([currentSaveId, day], [currentSaveId, 999])
						.toArray();

					const myNextMatch = futureMatches.find(
						(m) =>
							(m.homeTeamId === userTeamId || m.awayTeamId === userTeamId) &&
							!m.played,
					);
					
					if (myNextMatch) {
						const opponentId =
							myNextMatch.homeTeamId === userTeamId
								? myNextMatch.awayTeamId
								: myNextMatch.homeTeamId;
						const opponent = await db.teams.get(opponentId);
						if (opponent) {
                            // Conversion explicite pour le type TacticType
                            if (!opponent.tacticType) {
                                opponent.tacticType = "NORMAL" as TacticType;
                            }
							const opponentRank = leagueTeams.findIndex((t) => t.id === opponentId) + 1;
							setNextMatch({ match: myNextMatch, opponent, opponentRank });
							
							// Get opponent form - SAFE QUERY
							const oppRecent = await db.matches
								.where("saveId")
								.equals(currentSaveId)
								.filter(m => m.played === true && (m.homeTeamId === opponentId || m.awayTeamId === opponentId))
								.toArray();
							setOpponentForm(oppRecent.sort((a, b) => b.day - a.day).slice(0, 5).reverse());
						}
					}
				}
			} catch (e) {
				console.error("Dashboard load error", e);
			} finally {
				setIsLoading(false);
			}
		};
		loadDashboardData();
	}, [currentSaveId, userTeamId, day]);

	if (isLoading)
		return (
			<div className="p-8 text-center animate-pulse">{t("game.loading")}</div>
		);

	return (
		<div className="animate-fade-in">
			<SubTabs
				tabs={tabs}
				activeTab={activeTab}
				onChange={(id) => setUIContext("dashboard", id)}
			/>

			<div className="mt-2 pb-24 px-4">
				{activeTab === "club" ? (
					<div className="space-y-4 animate-fade-in">
						<ClubIdentityCard
							team={team}
							league={league}
							position={position}
							coach={coach}
						/>

						<NextMatchCard
							nextMatch={nextMatch}
							userTeam={team}
							userRank={position}
							currentDate={currentDate}
							onShowOpponent={onShowClub}
							userForm={userForm}
							opponentForm={opponentForm}
							currentDay={day}
						/>
					</div>
				) : activeTab === "board" ? (
					<BoardView />
				) : (
					<div className="animate-fade-in">
						<NewsList onNavigate={onNavigate} onSelectPlayer={onSelectPlayer} onSelectTeam={onShowClub} />
					</div>
				)}
			</div>
		</div>
	);
}
