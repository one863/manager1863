import { type League, type Match, type Team, type StaffMember, db, Player } from "@/db/db";
import { useGameStore } from "@/store/gameSlice";
import { useEffect, useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import NewsList from "@/views/News/NewsList";
import { SubTabs } from "@/components/Common/SubTabs";
import ClubIdentityCard from "@/components/Dashboard/ClubIdentityCard";
import NextMatchCard from "@/components/Dashboard/NextMatchCard";
import BoardView from "@/views/Club/BoardView";

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

	const [team, setTeam] = useState<Team | null>(null);
	const [league, setLeague] = useState<League | null>(null);
	const [coach, setCoach] = useState<StaffMember | null>(null);
	const [nextMatch, setNextMatch] = useState<{
		match: Match;
		opponent: Team;
	} | null>(null);
	const [position, setPosition] = useState<number>(0);
	const [isLoading, setIsLoading] = useState(true);
	const [activeTab, setActiveTab] = useState<"club" | "board" | "news">("club");

	const tabs = [
		{ id: "club", label: t("dashboard.club_tab", "Overview") },
		{ id: "board", label: t("club.board_tab", "Board") },
		{ id: "news", label: t("dashboard.news_tab", "Actus"), badge: unreadNewsCount },
	];

	useEffect(() => {
		const loadDashboardData = async () => {
			if (!currentSaveId || !userTeamId) return;
			try {
				const [userTeam, userCoach] = await Promise.all([
					db.teams.get(userTeamId),
					db.staff.where("[saveId+teamId]").equals([currentSaveId, userTeamId]).and(s => s.role === "COACH").first(),
				]);
				
				setTeam(userTeam || null);
				setCoach(userCoach || null);

				if (userTeam) {
					const userLeague = await db.leagues.get(userTeam.leagueId);
					setLeague(userLeague || null);
					const leagueTeams = await db.teams
						.where("leagueId")
						.equals(userTeam.leagueId)
						.toArray();
					leagueTeams.sort((a, b) => (b.points || 0) - (a.points || 0));
					setPosition(leagueTeams.findIndex((t) => t.id === userTeamId) + 1);

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
						if (opponent) setNextMatch({ match: myNextMatch, opponent });
					}
				}
			} catch (e) {
				console.error(e);
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
				onChange={(id) => setActiveTab(id as any)}
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
							userTeamId={userTeamId}
							userTeamName={team?.name || ""}
							currentDate={currentDate}
							onShowOpponent={onShowClub}
						/>
					</div>
				) : activeTab === "board" ? (
					<BoardView />
				) : (
					<div className="animate-fade-in">
						<NewsList onNavigate={onNavigate} onSelectPlayer={onSelectPlayer} />
					</div>
				)}
			</div>
		</div>
	);
}
