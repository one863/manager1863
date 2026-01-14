import ClubDetails from "@/components/ClubDetails";
import { BoardObjectiveCard } from "@/components/Dashboard/BoardObjectiveCard";
import ClubIdentityCard from "@/components/Dashboard/ClubIdentityCard";
import NextMatchCard from "@/components/Dashboard/NextMatchCard";
import { type League, type Match, type Team, db } from "@/db/db";
import { useGameStore } from "@/store/gameSlice";
import { useEffect, useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import { Layout, Users } from "lucide-preact";

export default function Dashboard({
	onNavigate,
}: { onNavigate?: (view: any) => void }) {
	const { t } = useTranslation();
	const currentSaveId = useGameStore((state) => state.currentSaveId);
	const userTeamId = useGameStore((state) => state.userTeamId);
	const day = useGameStore((state) => state.day);
	const currentDate = useGameStore((state) => state.currentDate);

	const [team, setTeam] = useState<Team | null>(null);
	const [league, setLeague] = useState<League | null>(null);
	const [nextMatch, setNextMatch] = useState<{
		match: Match;
		opponent: Team;
	} | null>(null);
	const [position, setPosition] = useState<number>(0);
	const [isLoading, setIsLoading] = useState(true);
	const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
	const [activeTab, setActiveTab] = useState<"club" | "board">("club");

	useEffect(() => {
		const loadDashboardData = async () => {
			if (!currentSaveId || !userTeamId) return;
			try {
				const userTeam = await db.teams.get(userTeamId);
				setTeam(userTeam || null);
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

	if (selectedTeamId) {
		return (
			<ClubDetails
				teamId={selectedTeamId}
				onClose={() => setSelectedTeamId(null)}
			/>
		);
	}

	return (
		<div className="pb-24 animate-fade-in">
			{/* ONGLETS DASHBOARD */}
			<div className="flex bg-paper-dark rounded-xl p-1 mb-6 border border-gray-200 shadow-inner">
				<button
					onClick={() => setActiveTab("club")}
					className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === "club" ? "bg-white text-accent shadow-sm" : "text-ink-light"}`}
				>
					<Users size={18} /> Club
				</button>
				<button
					onClick={() => setActiveTab("board")}
					className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === "board" ? "bg-white text-accent shadow-sm" : "text-ink-light"}`}
				>
					<Layout size={18} /> Bureau
				</button>
			</div>

			{activeTab === "club" ? (
				<div className="space-y-4 animate-fade-in">
					<ClubIdentityCard
						team={team}
						league={league}
						position={position}
						onClick={() => onNavigate?.("club")}
					/>

					<NextMatchCard
						nextMatch={nextMatch}
						userTeamId={userTeamId}
						userTeamName={team?.name || ""}
						currentDate={currentDate}
						onShowOpponent={setSelectedTeamId}
					/>
				</div>
			) : (
				<div className="space-y-4 animate-fade-in">
					<BoardObjectiveCard team={team} position={position} />
					
					{/* On pourrait rajouter ici d'autres infos de bureau comme la confiance du board etc */}
					<div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
						<h3 className="text-xs font-black uppercase tracking-widest text-ink-light mb-4">État du Management</h3>
						<div className="space-y-4">
							<div>
								<div className="flex justify-between text-xs font-bold mb-1">
									<span>Confiance du Président</span>
									<span className={team?.confidence && team.confidence > 70 ? "text-green-600" : "text-accent"}>
										{team?.confidence}%
									</span>
								</div>
								<div className="h-2 bg-gray-100 rounded-full overflow-hidden">
									<div 
										className={`h-full transition-all duration-500 ${team?.confidence && team.confidence > 70 ? "bg-green-500" : "bg-accent"}`}
										style={{ width: `${team?.confidence || 0}%` }}
									/>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
