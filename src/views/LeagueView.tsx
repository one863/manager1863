import { db, type League, type Match, type Team } from "@/db/db";
import { useGameStore } from "@/store/gameSlice";
import { ChevronLeft, ChevronRight, History as HistoryIcon, Trophy, Calendar as CalendarIcon } from "lucide-preact";
import { useEffect, useMemo, useState } from "preact/hooks";
import LeagueTable from "./LeagueTable";
import { SubTabs } from "@/components/Common/SubTabs";
import { useTranslation } from "react-i18next";

export default function LeagueView({
	onSelectMatch,
	onSelectTeam,
}: { onSelectMatch: (id: number) => void; onSelectTeam: (id: number) => void }) {
	const { t } = useTranslation();
	const currentSaveId = useGameStore((state) => state.currentSaveId);
	const userTeamId = useGameStore((state) => state.userTeamId);
	const day = useGameStore((state) => state.day);

	const [league, setLeague] = useState<League | null>(null);
	const [allMatches, setAllMatches] = useState<Match[]>([]);
	const [teams, setTeams] = useState<Team[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [activeTab, setActiveTab] = useState<"table" | "results" | "cup" | "history">("table");
	
	const matchDays = useMemo(() => {
		const days = Array.from(new Set(allMatches.map(m => m.day))).sort((a, b) => a - b);
		return days;
	}, [allMatches]);

	const [visibleDay, setVisibleDay] = useState<number>(day);

	useEffect(() => {
		if (matchDays.length > 0) {
			if (matchDays.includes(day)) {
				setVisibleDay(day);
			} else {
				const pastMatchDays = matchDays.filter(d => d <= day);
				if (pastMatchDays.length > 0) {
					setVisibleDay(pastMatchDays[pastMatchDays.length - 1]);
				} else {
					setVisibleDay(matchDays[0]);
				}
			}
		}
	}, [matchDays, day]);

	const tabs = [
		{ id: "table", label: t("league.table", "Classement") },
		{ id: "results", label: t("league.results", "Calendrier") },
		{ id: "cup", label: t("league.cup", "Coupe") },
		{ id: "history", label: t("league.history", "Historique") },
	];

	useEffect(() => {
		const loadLeagueData = async () => {
			if (!currentSaveId || !userTeamId) return;
			try {
				const userTeam = await db.teams.get(userTeamId);
				if (userTeam) {
					const [leagueData, leagueTeams, matches] = await Promise.all([
						db.leagues.get(userTeam.leagueId),
						db.teams.where("leagueId").equals(userTeam.leagueId).toArray(),
						db.matches
							.where("saveId")
							.equals(currentSaveId)
							.toArray(),
					]);

					setLeague(leagueData || null);
					setTeams(leagueTeams);
					
					const leagueTeamIds = new Set(leagueTeams.map(t => t.id));
					const filteredMatches = matches.filter(m => leagueTeamIds.has(m.homeTeamId));
					
					setAllMatches(filteredMatches);
				}
			} catch (e) {
				console.error(e);
			} finally {
				setIsLoading(false);
			}
		};
		loadLeagueData();
	}, [currentSaveId, userTeamId]);

	const currentJourneeIndex = useMemo(() => {
		return matchDays.indexOf(visibleDay);
	}, [matchDays, visibleDay]);

	const dayMatches = useMemo(() => {
		return allMatches.filter(m => m.day === visibleDay);
	}, [allMatches, visibleDay]);

	if (isLoading) return <div className="p-8 text-center">{t("game.loading")}</div>;

	return (
		<div className="animate-fade-in flex flex-col h-full overflow-hidden">
			<SubTabs
				tabs={tabs}
				activeTab={activeTab}
				onChange={(id) => setActiveTab(id as any)}
			/>

			<div className="flex-1 overflow-y-auto pb-24">
				{activeTab === "table" ? (
					<div className="px-4">
						<LeagueTable onShowTeam={onSelectTeam} />
					</div>
				) : activeTab === "results" ? (
					<div className="flex flex-col h-full">
						<div className="flex items-center justify-between px-4 py-3 bg-paper-dark/50 border-b border-gray-200 sticky top-0 z-10 backdrop-blur-sm">
							<button 
								onClick={() => setVisibleDay(matchDays[currentJourneeIndex - 1])}
								disabled={currentJourneeIndex <= 0}
								className="p-1 disabled:opacity-20 text-ink"
							>
								<ChevronLeft size={20} />
							</button>
							<div className="flex flex-col items-center">
								<span className="text-[10px] font-black uppercase tracking-widest text-ink-light">Journée {currentJourneeIndex + 1}</span>
								<span className="text-sm font-serif font-black text-ink">Jour {visibleDay}</span>
							</div>
							<button 
								onClick={() => setVisibleDay(matchDays[currentJourneeIndex + 1])}
								disabled={currentJourneeIndex >= matchDays.length - 1}
								className="p-1 disabled:opacity-20 text-ink"
							>
								<ChevronRight size={20} />
							</button>
						</div>

						<div className="p-4 space-y-2">
							{dayMatches.length === 0 ? (
								<div className="text-center py-12 text-ink-light italic">
									Aucun match programmé.
								</div>
							) : (
								dayMatches.map((match) => {
									const homeTeam = teams.find((t) => t.id === match.homeTeamId);
									const awayTeam = teams.find((t) => t.id === match.awayTeamId);
									const isUserMatch = match.homeTeamId === userTeamId || match.awayTeamId === userTeamId;

									return (
										<div
											key={match.id}
											className={`bg-white p-3 rounded-xl border ${isUserMatch ? 'border-accent ring-1 ring-accent/20' : 'border-gray-100'} shadow-sm flex items-center gap-3 transition-all ${match.played ? 'cursor-pointer hover:bg-paper-dark/30' : 'opacity-80'}`}
										>
											<div className="flex-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
												{/* Home Team Clickable */}
												<button 
													onClick={(e) => { e.stopPropagation(); onSelectTeam(match.homeTeamId); }}
													className={`text-right text-xs font-bold truncate hover:text-accent transition-colors ${match.played && match.homeScore > match.awayScore ? 'text-ink' : 'text-ink-light'}`}
												>
													{homeTeam?.name}
												</button>

												{/* Score / VS Clickable to match report */}
												<div 
													onClick={() => match.played && onSelectMatch(match.id!)}
													className="flex items-center justify-center bg-paper-dark px-3 py-1 rounded-lg min-w-[60px] cursor-pointer hover:bg-gray-200 transition-colors"
												>
													{match.played ? (
														<span className="font-mono font-black text-sm">
															{match.homeScore} - {match.awayScore}
														</span>
													) : (
														<span className="text-[10px] font-black text-ink-light">VS</span>
													)}
												</div>

												{/* Away Team Clickable */}
												<button 
													onClick={(e) => { e.stopPropagation(); onSelectTeam(match.awayTeamId); }}
													className={`text-left text-xs font-bold truncate hover:text-accent transition-colors ${match.played && match.awayScore > match.homeScore ? 'text-ink' : 'text-ink-light'}`}
												>
													{awayTeam?.name}
												</button>
											</div>
											
											{isUserMatch && (
												<div className="w-1.5 h-1.5 bg-accent rounded-full shrink-0" title="Votre match" />
											)}
										</div>
									);
								})
							)}
						</div>
						
						{!matchDays.includes(day) && (
							<div className="mt-4 text-center">
								<button 
									onClick={() => {
										const pastMatchDays = matchDays.filter(d => d <= day);
										if (pastMatchDays.length > 0) {
											setVisibleDay(pastMatchDays[pastMatchDays.length - 1]);
										}
									}}
									className="px-4 py-2 bg-white border border-gray-200 rounded-full shadow-sm text-[10px] font-black uppercase tracking-widest text-ink-light hover:text-accent transition-colors flex items-center gap-2 mx-auto"
								>
									<CalendarIcon size={12} /> Voir dernier match joué
								</button>
							</div>
						)}
					</div>
				) : activeTab === "cup" ? (
					<div className="py-20 text-center opacity-30">
						<Trophy size={64} className="mx-auto mb-4" />
						<p className="font-serif italic">La coupe nationale n'a pas encore débuté.</p>
					</div>
				) : (
					<div className="py-20 text-center opacity-30">
						<HistoryIcon size={64} className="mx-auto mb-4" />
						<p className="font-serif italic">Historique des saisons précédentes indisponible.</p>
					</div>
				)}
			</div>
		</div>
	);
}
