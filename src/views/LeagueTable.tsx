import { type League, type Team, db } from "@/db/db";
import { useGameStore } from "@/store/gameSlice";
import {
	ArrowDown,
	ArrowUp,
	ChevronLeft,
	ChevronRight,
	Trophy,
} from "lucide-preact";
import { useEffect, useState } from "preact/hooks";
import { useTranslation } from "react-i18next";

interface TableRow extends Team {
	goalDiff: number;
	goalsFor: number;
	goalsAgainst: number;
	won: number;
	drawn: number;
	lost: number;
}

export default function LeagueTable({
	onShowTeam,
}: { onShowTeam?: (id: number) => void }) {
	const { t } = useTranslation();
	const currentSaveId = useGameStore((state) => state.currentSaveId);
	const userTeamId = useGameStore((state) => state.userTeamId);

	const [table, setTable] = useState<TableRow[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	const [leagues, setLeagues] = useState<League[]>([]);
	const [currentLeagueIndex, setCurrentLeagueIndex] = useState(0);

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
						const userLeagueIndex = activeLeagues.findIndex(
							(l) => l.id === userTeam.leagueId,
						);
						if (userLeagueIndex !== -1) {
							setCurrentLeagueIndex(userLeagueIndex);
						}
					}
				}
			} catch (error) {
				console.error("Failed to init league table", error);
			}
		};
		init();
	}, [currentSaveId, userTeamId]);

	useEffect(() => {
		let isMounted = true;
		const loadTable = async () => {
			if (currentSaveId === null || leagues.length === 0) return;

			setIsLoading(true);
			try {
				const targetLeagueId = leagues[currentLeagueIndex].id!;

				const allTeamsInSave = await db.teams
					.where("saveId")
					.equals(currentSaveId)
					.toArray();

				const teams = allTeamsInSave.filter(
					(t) => t.leagueId === targetLeagueId,
				);

				const allMatchesInSave = await db.matches
					.where("saveId")
					.equals(currentSaveId)
					.filter((m) => !!m.played)
					.toArray();

				const matches = allMatchesInSave.filter(
					(m) => m.leagueId === targetLeagueId,
				);

				const rows: TableRow[] = teams.map((team) => {
					let won = 0;
					let drawn = 0;
					let lost = 0;
					let gf = 0;
					let ga = 0;

					matches.forEach((m) => {
						if (m.homeTeamId === team.id) {
							gf += m.homeScore;
							ga += m.awayScore;
							if (m.homeScore > m.awayScore) won++;
							else if (m.homeScore === m.awayScore) drawn++;
							else lost++;
						} else if (m.awayTeamId === team.id) {
							gf += m.awayScore;
							ga += m.homeScore;
							if (m.awayScore > m.homeScore) won++;
							else if (m.awayScore === m.homeScore) drawn++;
							else lost++;
						}
					});

					return {
						...team,
						won,
						drawn,
						lost,
						goalsFor: gf,
						goalsAgainst: ga,
						goalDiff: gf - ga,
					};
				});

				rows.sort((a, b) => {
					if ((b.points || 0) !== (a.points || 0))
						return (b.points || 0) - (a.points || 0);
					if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
					if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
					return (b.reputation || 0) - (a.reputation || 0);
				});

				if (isMounted) {
					setTable(rows);
					setIsLoading(false);
				}
			} catch (error) {
				console.error("Failed to load league table", error);
				if (isMounted) setIsLoading(false);
			}
		};

		loadTable();
		return () => {
			isMounted = false;
		};
	}, [currentSaveId, leagues, currentLeagueIndex]);

	const handlePrevLeague = () => {
		setCurrentLeagueIndex((prev) => Math.max(0, prev - 1));
	};

	const handleNextLeague = () => {
		setCurrentLeagueIndex((prev) => Math.min(leagues.length - 1, prev + 1));
	};

	const getPositionStyle = (index: number) => {
		if (leagues.length === 0) return "";
		const league = leagues[currentLeagueIndex];

		if (league.promotionSpots > 0 && index < league.promotionSpots) {
			return "border-l-4 border-green-500 bg-green-50/50";
		}

		if (
			league.relegationSpots > 0 &&
			index >= table.length - league.relegationSpots
		) {
			return "border-l-4 border-red-500 bg-red-50/50";
		}

		return "border-l-4 border-transparent";
	};

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
			{/* Header avec sélecteur de ligue - SANS TITRE */}
			<div className="mb-4 px-1">
				{leagues.length > 0 && (
					<div className="flex items-center justify-between bg-white p-1.5 rounded-lg shadow-sm border border-gray-100">
						<button
							onClick={handlePrevLeague}
							disabled={currentLeagueIndex === 0}
							className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
						>
							<ChevronLeft size={18} />
						</button>
						<span className="font-serif font-bold text-ink text-sm">
							{leagues[currentLeagueIndex]?.name || "Unknown League"}
						</span>
						<button
							onClick={handleNextLeague}
							disabled={currentLeagueIndex === leagues.length - 1}
							className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
						>
							<ChevronRight size={18} />
						</button>
					</div>
				)}
			</div>

			{isLoading ? (
				<div className="p-8 text-center animate-pulse">
					<div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-2" />
					<p className="text-[10px] italic text-ink-light">
						Chargement du classement...
					</p>
				</div>
			) : (
				<div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
					<table className="w-full text-xs text-left border-collapse min-w-[350px]">
						<thead className="bg-paper-dark text-[9px] uppercase font-bold text-ink-light border-b border-gray-300">
							<tr>
								<th className="px-1 py-2 text-center w-8">Pos</th>
								<th className="px-2 py-2">{t("league_table.club")}</th>
								<th
									className="px-0.5 py-2 text-center w-7 hidden sm:table-cell"
									title="Matchs Joués"
								>
									{t("league_table.p")}
								</th>
								<th className="px-0.5 py-2 text-center w-7" title="Gagnés">
									G
								</th>
								<th className="px-0.5 py-2 text-center w-7" title="Nuls">
									N
								</th>
								<th className="px-0.5 py-2 text-center w-7" title="Perdus">
									P
								</th>
								<th
									className="px-0.5 py-2 text-center w-7 hidden sm:table-cell"
									title="Buts Pour"
								>
									{t("league_table.gf")}
								</th>
								<th
									className="px-0.5 py-2 text-center w-7 hidden sm:table-cell"
									title="Buts Contre"
								>
									{t("league_table.ga")}
								</th>
								<th
									className="px-1 py-2 text-center w-8"
									title="Différence de buts"
								>
									Diff
								</th>
								<th className="px-2 py-2 text-center w-9 font-bold text-ink bg-paper-dark/50 italic">
									{t("league_table.pts")}
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100">
							{table.length > 0 ? (
								table.map((row, index) => (
									<tr
										key={row.id}
										onClick={() => onShowTeam?.(row.id!)}
										className={`cursor-pointer ${row.id === userTeamId ? "bg-black/5 font-bold ring-1 ring-inset ring-black/10" : ""} hover:bg-gray-50 transition-colors ${getPositionStyle(index)}`}
									>
										<td className="px-1 py-3 text-center text-ink-light font-mono text-[10px] border-r border-gray-100/50 relative">
											{index + 1}
											{leagues[currentLeagueIndex].promotionSpots > 0 &&
												index <
													leagues[currentLeagueIndex].promotionSpots && (
													<ArrowUp
														size={8}
														className="absolute top-1 right-0.5 text-green-500 opacity-50"
													/>
												)}
											{leagues[currentLeagueIndex].relegationSpots > 0 &&
												index >=
													table.length -
														leagues[currentLeagueIndex].relegationSpots && (
													<ArrowDown
														size={8}
														className="absolute top-1 right-0.5 text-red-500 opacity-50"
													/>
												)}
										</td>
										<td className="px-2 py-3">
											<div className="flex items-center gap-1.5">
												{index === 0 &&
													leagues[currentLeagueIndex].level === 1 && (
														<Trophy size={10} className="text-yellow-600" />
													)}
												<span className="text-ink truncate max-w-[110px] sm:max-w-none text-[11px]">
													{row.name}
												</span>
											</div>
										</td>
										<td className="px-0.5 py-3 text-center text-ink-light font-mono text-[10px] hidden sm:table-cell">
											{row.matchesPlayed || 0}
										</td>
										<td className="px-0.5 py-3 text-center text-ink-light font-mono text-[10px]">
											{row.won}
										</td>
										<td className="px-0.5 py-3 text-center text-ink-light font-mono text-[10px]">
											{row.drawn}
										</td>
										<td className="px-0.5 py-3 text-center text-ink-light font-mono text-[10px]">
											{row.lost}
										</td>
										<td className="px-0.5 py-3 text-center text-ink-light font-mono text-[10px] hidden sm:table-cell">
											{row.goalsFor}
										</td>
										<td className="px-0.5 py-3 text-center text-ink-light font-mono text-[10px] hidden sm:table-cell">
											{row.goalsAgainst}
										</td>
										<td className="px-1 py-3 text-center text-ink-light font-mono text-[10px]">
											{row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}
										</td>
										<td className="px-2 py-3 text-center font-bold text-black bg-black/5 italic border-l border-gray-100/50 text-[11px]">
											{row.points || 0}
										</td>
									</tr>
								))
							) : (
								<tr>
									<td
										colSpan={10}
										className="px-3 py-6 text-center text-ink-light italic text-[10px]"
									>
										Aucune équipe trouvée dans cette ligue.
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			)}

			<div className="mt-4 px-4 py-2 bg-paper-dark/30 rounded-lg border border-dashed border-gray-300 text-[9px] text-ink-light text-center italic">
				* Victoire = 3 pts, Nul = 1 pt.
			</div>
		</div>
	);
}
