import ClubDetails from "@/components/ClubDetails";
import { type League, type Match, type Team, db } from "@/db/db";
import { useGameStore } from "@/store/gameSlice";
import {
	Calendar as CalendarIcon,
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
} from "lucide-preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { useTranslation } from "react-i18next";

interface CalendarProps {
	onSelectMatch: (matchId: number) => void;
	hideHeader?: boolean;
}

export default function Calendar({
	onSelectMatch,
	hideHeader = false,
}: CalendarProps) {
	const { t } = useTranslation();
	const currentSaveId = useGameStore((state) => state.currentSaveId);
	const userTeamId = useGameStore((state) => state.userTeamId);
	const currentDay = useGameStore((state) => state.day);

	const [matches, setMatches] = useState<Match[]>([]);
	const [teams, setTeams] = useState<Record<number, Team>>({});
	const [leagues, setLeagues] = useState<League[]>([]);
	const [currentLeagueIndex, setCurrentLeagueIndex] = useState(0);
	const [isLoading, setIsLoading] = useState(true);
	const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);

	const nextMatchRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const init = async () => {
			if (!currentSaveId) return;

			try {
				const allTeamsInSave = await db.teams
					.where("saveId")
					.equals(currentSaveId)
					.toArray();

				const activeLeagueIds = new Set(allTeamsInSave.map((t) => t.leagueId));
				const allLeaguesPotentially = await db.leagues
					.where("saveId")
					.equals(currentSaveId)
					.sortBy("level");

				const activeLeagues = allLeaguesPotentially.filter((l) =>
					activeLeagueIds.has(l.id!),
				);

				if (activeLeagues.length === 0) {
					setLeagues(allLeaguesPotentially);
				} else {
					setLeagues(activeLeagues);
				}

				if (userTeamId) {
					const userTeam = await db.teams.get(userTeamId);
					if (userTeam) {
						// eslint-disable-next-line eqeqeq
						const userLeagueIndex = activeLeagues.findIndex(
							(l) => l.id === userTeam.leagueId,
						);
						if (userLeagueIndex !== -1) {
							setCurrentLeagueIndex(userLeagueIndex);
						}
					}
				}
			} catch (error) {
				console.error("Failed to init calendar leagues", error);
			}
		};
		init();
	}, [currentSaveId, userTeamId]);

	useEffect(() => {
		const loadData = async () => {
			if (currentSaveId === null || leagues.length === 0) {
				setIsLoading(false);
				return;
			}

			setIsLoading(true);
			try {
				const targetLeagueId = leagues[currentLeagueIndex].id!;

				const allTeams = await db.teams
					.where("saveId")
					.equals(currentSaveId)
					.toArray();
				const teamsMap: Record<number, Team> = {};
				allTeams.forEach((team) => {
					if (team.id) teamsMap[team.id] = team;
				});
				setTeams(teamsMap);

				// eslint-disable-next-line eqeqeq
				const leagueMatches = await db.matches
					.where("saveId")
					.equals(currentSaveId)
					.filter((m) => m.leagueId === targetLeagueId)
					.toArray();

				leagueMatches.sort((a, b) => a.day - b.day);
				setMatches(leagueMatches);
			} catch (error) {
				console.error("Erreur chargement calendrier:", error);
			} finally {
				setIsLoading(false);
			}
		};
		loadData();
	}, [currentSaveId, leagues, currentLeagueIndex]);

	useEffect(() => {
		if (!isLoading && nextMatchRef.current) {
			const timer = setTimeout(() => {
				nextMatchRef.current?.scrollIntoView({
					behavior: "smooth",
					block: "start",
				});
			}, 300);
			return () => clearTimeout(timer);
		}
	}, [isLoading]);

	const handlePrevLeague = () => {
		setCurrentLeagueIndex((prev) => Math.max(0, prev - 1));
	};

	const handleNextLeague = () => {
		setCurrentLeagueIndex((prev) => Math.min(leagues.length - 1, prev + 1));
	};

	const matchesByDay = matches.reduce(
		(acc, match) => {
			if (!acc[match.day]) {
				acc[match.day] = [];
			}
			acc[match.day].push(match);
			return acc;
		},
		{} as Record<number, Match[]>,
	);

	const days = Object.keys(matchesByDay)
		.map(Number)
		.sort((a, b) => a - b);
	const nextActiveDay =
		days.find((d) => d >= currentDay) || days[days.length - 1];

	if (isLoading && leagues.length === 0)
		return (
			<div className="p-8 text-center animate-pulse flex flex-col items-center gap-2">
				<div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
				<span className="font-serif italic text-ink-light">
					{t("game.loading")}
				</span>
			</div>
		);

	return (
		<div className="animate-fade-in">
			{/* Header avec sélecteur de ligue */}
			<div className="flex flex-col gap-4 mb-6 px-2">
				{!hideHeader && (
					<div className="flex justify-between items-center">
						<h2 className="text-xl font-serif font-bold text-ink flex items-center gap-2">
							<CalendarIcon size={20} className="text-black" />
							{t("calendar.title")}
						</h2>
					</div>
				)}

				{leagues.length > 0 && (
					<div className="flex items-center justify-between bg-white p-2 rounded-lg shadow-sm border border-gray-200">
						<button
							onClick={handlePrevLeague}
							disabled={currentLeagueIndex === 0}
							className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
						>
							<ChevronLeft size={20} />
						</button>
						<span className="font-serif font-bold text-ink">
							{leagues[currentLeagueIndex]?.name || "Unknown League"}
						</span>
						<button
							onClick={handleNextLeague}
							disabled={currentLeagueIndex === leagues.length - 1}
							className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
						>
							<ChevronRight size={20} />
						</button>
					</div>
				)}
			</div>

			{isLoading ? (
				<div className="p-8 text-center animate-pulse">
					<div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-2" />
					<p className="text-xs italic text-ink-light">
						Chargement du calendrier...
					</p>
				</div>
			) : (
				<div className="space-y-6 pb-20">
					{days.map((day, index) => (
						<div
							key={day}
							className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
							ref={day === nextActiveDay ? nextMatchRef : null}
						>
							<div
								className={`
                  px-4 py-2 text-[10px] uppercase font-bold tracking-wider border-b border-gray-100 flex justify-between items-center
                  ${day < currentDay ? "bg-gray-50 text-ink-light" : day === currentDay ? "bg-black text-white" : "bg-paper-dark text-ink"}
                `}
							>
								<span>Journée {index + 1}</span>
								<span className="opacity-70 font-mono">Jour {day}</span>
							</div>

							<div className="divide-y divide-gray-50">
								{matchesByDay[day].map((match) => {
									const homeTeam = teams[match.homeTeamId];
									const awayTeam = teams[match.awayTeamId];
									const isUserMatch =
										match.homeTeamId === userTeamId ||
										match.awayTeamId === userTeamId;

									return (
										<div
											key={match.id}
											className={`
                        flex items-center px-4 py-3 gap-3 transition-colors
                        ${isUserMatch ? "bg-black/5" : "hover:bg-gray-50"}
                        ${match.played ? "opacity-100" : "opacity-90"}
                      `}
										>
											<div className="flex-1 flex items-center justify-between min-w-0">
												<button
													onClick={() => setSelectedTeamId(match.homeTeamId)}
													className={`flex-1 text-right text-xs truncate hover:underline font-medium ${match.homeTeamId === userTeamId ? "font-bold text-black" : "text-ink"}`}
												>
													{homeTeam?.name || "???"}
												</button>

												<div
													onClick={() =>
														match.played && onSelectMatch(match.id!)
													}
													className={`
                            mx-3 min-w-[3.5rem] py-1 text-center font-mono font-bold text-xs rounded border transition-all
                            ${match.played ? "bg-white border-gray-200 text-black shadow-sm cursor-pointer hover:border-black" : "bg-transparent border-transparent text-ink-light"}
                          `}
												>
													{match.played
														? `${match.homeScore} - ${match.awayScore}`
														: "vs"}
												</div>

												<button
													onClick={() => setSelectedTeamId(match.awayTeamId)}
													className={`flex-1 text-left text-xs truncate hover:underline font-medium ${match.awayTeamId === userTeamId ? "font-bold text-black" : "text-ink"}`}
												>
													{awayTeam?.name || "???"}
												</button>
											</div>

											<div className="w-5 flex justify-center">
												{match.played ? (
													<CheckCircle2 size={14} className="text-green-500" />
												) : isUserMatch ? (
													<div className="w-1.5 h-1.5 bg-black rounded-full animate-pulse" />
												) : null}
											</div>
										</div>
									);
								})}
							</div>
						</div>
					))}
					{days.length === 0 && (
						<div className="p-8 text-center text-ink-light italic">
							Aucun match trouvé pour cette ligue.
						</div>
					)}
				</div>
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
