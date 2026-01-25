import { db } from "@/core/db/db";
import { useGameStore } from "@/infrastructure/store/gameSlice";
import { Calendar as CalendarIcon, ArrowLeft, ArrowRight } from "lucide-preact";
import { useEffect, useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import { SubTabs } from "@/ui/components/Common/SubTabs";
import LeagueTable from "./components/LeagueTable";
import { TeamCrest, getTeamColors } from "@/ui/components/Common/TeamCrest";

interface LeagueViewProps {
	onSelectMatch: (id: number) => void;
	onSelectTeam: (id: number) => void;
}

export default function LeagueView({ onSelectMatch, onSelectTeam }: LeagueViewProps) {
	const { t } = useTranslation();
	const currentSaveId = useGameStore((state) => state.currentSaveId);
	const userTeamId = useGameStore((state) => state.userTeamId);
	const currentDay = useGameStore((state) => state.day);
    const activeTab = useGameStore((state) => (state.uiContext.league as string) || "table");
    const setUIContext = useGameStore((state) => state.setUIContext);
	
	const [leagueId, setLeagueId] = useState<number | null>(null);
	const [matchesByRound, setMatchesByRound] = useState<Record<number, any[]>>({});
	const [teamsData, setTeamsData] = useState<Record<number, any>>({});
	const [selectedRound, setSelectedRound] = useState<number>(1);
	const [maxRound, setMaxRound] = useState<number>(1);

	const loadLeagueData = async () => {
		if (!userTeamId || !currentSaveId) return;

		try {
			const team = await db.teams.get(Number(userTeamId));
			if (team) {
				setLeagueId(Number(team.leagueId));
				
				const allMatches = await db.matches
					.where("saveId")
					.equals(Number(currentSaveId))
					.toArray();
				
				const leagueMatches = allMatches.filter(m => 
					Number(m.leagueId) === Number(team.leagueId)
				);
				
				const leagueTeams = await db.teams
					.where("leagueId")
					.equals(Number(team.leagueId))
					.toArray();
				
				const teamsMap: Record<number, any> = {};
				leagueTeams.forEach(t => {
					teamsMap[t.id!] = t;
				});
				setTeamsData(teamsMap);

				// DEBUG: Afficher les matchs récupérés et le mapping par round
				// eslint-disable-next-line no-console
				console.log('[DEBUG LeagueView] leagueMatches:', leagueMatches);

				// Grouper par journée
				const rounds: Record<number, any[]> = {};
				let highestRound = 1;
				leagueMatches.forEach(m => {
					const roundNum = Math.floor((m.day - 6) / 7) + 1;
					if (!rounds[roundNum]) rounds[roundNum] = [];
					rounds[roundNum].push(m);
					if (roundNum > highestRound) highestRound = roundNum;
				});

				// eslint-disable-next-line no-console
				console.log('[DEBUG LeagueView] rounds:', rounds);

				setMatchesByRound(rounds);
				setMaxRound(highestRound);

				// Déterminer la journée actuelle/prochaine
				const currentRound = Math.floor((currentDay - 1) / 7) + 1;
				setSelectedRound(Math.min(highestRound, Math.max(1, currentRound)));
			}
		} catch (error) {
			console.error("LeagueView Load Error:", error);
		}
	};

	useEffect(() => {
		loadLeagueData();
	}, [userTeamId, currentSaveId, currentDay]);

	const tabs = [
		{ id: "table", label: t("league.table_tab", "Classement") },
		{ id: "fixtures", label: t("league.fixtures_tab", "Calendrier") },
	];

	if (!currentSaveId || !userTeamId) return null;

	const handlePrevRound = () => setSelectedRound(prev => Math.max(1, prev - 1));
	const handleNextRound = () => setSelectedRound(prev => Math.min(maxRound, prev + 1));

	const currentRoundMatches = matchesByRound[selectedRound] || [];

	return (
		<div className="flex flex-col h-full bg-white animate-fade-in overflow-hidden">
			<SubTabs
				tabs={tabs}
				activeTab={activeTab}
				onChange={(id) => setUIContext("league", id)}
			/>

			<div className="flex-1 overflow-hidden font-sans">
				{activeTab === "table" && leagueId ? (
					<LeagueTable 
						initialLeagueId={leagueId} 
						saveId={Number(currentSaveId)} 
						currentDay={currentDay}
						onSelectTeam={onSelectTeam} 
					/>
				) : (
					<div className="flex flex-col h-full">
						{/* Sélecteur de Journée */}
						<div className="px-4 py-2 border-b border-gray-50 flex items-center justify-between bg-white sticky top-0 z-10">
							<button 
								onClick={handlePrevRound} 
								disabled={selectedRound <= 1}
								className={`p-2 transition-colors ${selectedRound <= 1 ? "text-gray-200" : "text-ink-light hover:text-accent"}`}
							>
								<ArrowLeft size={16} />
							</button>
							<div className="flex flex-col items-center">
								<span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">Journée {selectedRound}</span>
							</div>
							<button 
								onClick={handleNextRound} 
								disabled={selectedRound >= maxRound}
								className={`p-2 transition-colors ${selectedRound >= maxRound ? "text-gray-200" : "text-ink-light hover:text-accent"}`}
							>
								<ArrowRight size={16} />
							</button>
						</div>

						<div className="flex-1 overflow-y-auto p-4 pb-12">
							{currentRoundMatches.length === 0 ? (
								<div className="py-20 text-center flex flex-col items-center opacity-30">
									<CalendarIcon size={48} className="mb-2" />
									<p className="text-xs font-serif italic">Aucun match trouvé</p>
								</div>
							) : (
								<div className="space-y-3">
									{currentRoundMatches.map((match) => {
                                        const homeTeam = teamsData[match.homeTeamId];
                                        const awayTeam = teamsData[match.awayTeamId];
                                        const isHomeUser = Number(match.homeTeamId) === Number(userTeamId);
                                        const isAwayUser = Number(match.awayTeamId) === Number(userTeamId);
                                        const isUserMatch = isHomeUser || isAwayUser;

                                        const homeColors = getTeamColors(homeTeam);
                                        const awayColors = getTeamColors(awayTeam);

                                        return (
                                            <div
                                                key={match.id}
                                                onClick={() => match.played && onSelectMatch(match.id)}
                                                className={`
                                                    p-4 rounded-2xl border flex items-center justify-center gap-2 transition-all
                                                    ${isUserMatch ? 'bg-accent/5 border-accent/20' : 'bg-white border-gray-100'}
                                                    ${match.played ? 'cursor-pointer hover:border-accent/30 hover:shadow-sm' : ''}
                                                `}
                                            >
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); onSelectTeam(match.homeTeamId); }}
                                                    className={`text-xs font-bold truncate flex-1 flex flex-col items-center gap-2 hover:text-accent transition-colors ${isHomeUser ? 'text-accent' : 'text-ink'}`}
                                                >
                                                    <div className="shrink-0 scale-75">
                                                        <TeamCrest primary={homeColors.primary} secondary={homeColors.secondary} size="sm" name={homeTeam?.name} type={homeTeam?.logoType} />
                                                    </div>
                                                    <span className="max-w-[80px] text-center leading-tight">{homeTeam?.name || "Dom."}</span>
                                                </button>
                                                
                                                <div className={`w-14 text-center font-mono font-black py-2 rounded-xl text-xs shrink-0 ${match.played ? (isUserMatch ? 'bg-accent text-white shadow-sm' : 'bg-gray-100 text-ink') : 'bg-white text-slate-300 border border-slate-100 italic'}`}>
                                                    {match.played ? `${match.homeScore} - ${match.awayScore}` : "vs"}
                                                </div>
                                                
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); onSelectTeam(match.awayTeamId); }}
                                                    className={`text-xs font-bold truncate flex-1 flex flex-col items-center gap-2 hover:text-accent transition-colors ${isAwayUser ? 'text-accent' : 'text-ink'}`}
                                                >
                                                    <div className="shrink-0 scale-75">
                                                        <TeamCrest primary={awayColors.primary} secondary={awayColors.secondary} size="sm" name={awayTeam?.name} type={awayTeam?.logoType} />
                                                    </div>
                                                    <span className="max-w-[80px] text-center leading-tight">{awayTeam?.name || "Ext."}</span>
                                                </button>
                                            </div>
                                        );
                                    })}
								</div>
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
