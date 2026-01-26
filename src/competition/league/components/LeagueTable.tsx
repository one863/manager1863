import { db } from "@/core/db/db";
import { useGameStore } from "@/infrastructure/store/gameSlice";
import { ArrowLeft, ArrowRight, Star } from "lucide-preact";
import { useEffect, useState } from "preact/hooks";
import { useTranslation } from "react-i18next";

export default function LeagueTable({
	initialLeagueId,
	saveId,
	currentDay,
	onSelectTeam, 
}: { initialLeagueId: number; saveId: number; currentDay: number; onSelectTeam?: (id: number) => void }) {
	const { t } = useTranslation();
    const userTeamId = useGameStore((state) => state.userTeamId);
	const [activeLeagueId, setActiveLeagueId] = useState(initialLeagueId);
	const [teams, setTeams] = useState<any[]>([]);
	const [leagues, setLeagues] = useState<any[]>([]);
	const [activeLeagueName, setActiveLeagueName] = useState("");

	useEffect(() => {
		const loadLeagues = async () => {
			const allLeagues = await db.leagues.where("saveId").equals(saveId).sortBy("level");
			setLeagues(allLeagues);

			const initialLeague = allLeagues.find(l => l.id === activeLeagueId);
            if (initialLeague) {
                setActiveLeagueName(initialLeague.name);
            } else if (allLeagues.length > 0 && allLeagues[0].id) {
                setActiveLeagueId(allLeagues[0].id);
                setActiveLeagueName(allLeagues[0].name);
            }
		};
		loadLeagues();
	}, [saveId]);

	useEffect(() => {
		const loadTeams = async () => {
			if (!activeLeagueId) return;

			const league = await db.leagues.get(activeLeagueId);
			if (league) setActiveLeagueName(league.name);

			const leagueTeams = await db.teams
				.where("leagueId")
				.equals(activeLeagueId)
				.toArray();
            
			leagueTeams.sort((a, b) => {
				const pointsDiff = (b.points || 0) - (a.points || 0);
				if (pointsDiff !== 0) return pointsDiff;
				const gdDiff = (b.goalDifference || 0) - (a.goalDifference || 0);
				if (gdDiff !== 0) return gdDiff;
				return (b.goalsFor || 0) - (a.goalsFor || 0);
			});
			setTeams(leagueTeams);
		};
		loadTeams();
	}, [activeLeagueId, currentDay]);

    const handlePrevLeague = () => {
        const currentIndex = leagues.findIndex(l => l.id === activeLeagueId);
        if (currentIndex > 0) {
            setActiveLeagueId(leagues[currentIndex - 1].id);
        } else {
            setActiveLeagueId(leagues[leagues.length - 1].id);
        }
    };

    const handleNextLeague = () => {
        const currentIndex = leagues.findIndex(l => l.id === activeLeagueId);
        if (currentIndex < leagues.length - 1) {
            setActiveLeagueId(leagues[currentIndex + 1].id);
        } else {
            setActiveLeagueId(leagues[0].id);
        }
    };

	return (
		<div className="flex flex-col h-full bg-white overflow-hidden">
			{/* Navigation entre les ligues */}
			<div className="px-4 py-2 border-b border-gray-50 flex items-center justify-between sticky top-0 bg-white z-30">
				<button onClick={handlePrevLeague} className="p-2 text-ink-light hover:text-accent transition-colors">
					<ArrowLeft size={16} />
				</button>
				<div className="flex flex-col items-center">
					<span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">{activeLeagueName}</span>
				</div>
				<button onClick={handleNextLeague} className="p-2 text-ink-light hover:text-accent transition-colors">
					<ArrowRight size={16} />
				</button>
			</div>

			<div className="flex-1 overflow-auto">
				<table className="w-full text-left border-collapse min-w-[380px]">
					<thead className="bg-gray-50 sticky top-0 z-20 text-[10px] font-black uppercase tracking-tight text-gray-500">
						<tr>
							<th className="px-1 py-3 w-8 text-center bg-gray-50">#</th>
							<th className="px-1 py-3 w-28 sticky left-0 bg-gray-50 z-20 shadow-[1px_0_0_0_rgba(0,0,0,0.05)]">Club</th>
							<th className="px-1 py-3 text-center w-8">J</th>
							<th className="px-1 py-3 text-center w-6">G</th>
							<th className="px-1 py-3 text-center w-6">N</th>
							<th className="px-1 py-3 text-center w-6">P</th>
							<th className="px-1 py-3 text-center w-12 text-[8px]">Bp/Bc</th>
							<th className="px-1 py-3 text-center w-8">Diff</th>
							<th className="px-1 py-3 text-center w-10 font-bold text-ink">Pts</th>
						</tr>
					</thead>
					<tbody className="text-xs font-sans">
						{teams.map((team, index) => {
                            const isUserTeam = team.id === userTeamId;
                            const rowBg = isUserTeam ? "bg-accent/5" : "bg-white";
                            return (
                                <tr 
                                    key={team.id} 
                                    className={`border-b border-gray-50 last:border-0 ${rowBg}`}
                                >
                                    <td className={`px-1 py-3 text-center font-bold ${isUserTeam ? "text-accent" : (index === 0 ? "text-amber-500" : "text-gray-500")}`}>
                                        {index + 1}
                                    </td>
                                    <td className={`px-1 py-3 font-bold truncate sticky left-0 z-10 shadow-[1px_0_0_0_rgba(0,0,0,0.05)] ${rowBg}`}>
                                        <button 
                                            onClick={() => onSelectTeam?.(team.id)}
                                            className={`hover:text-accent text-left transition-colors flex items-center gap-1 w-full ${isUserTeam ? "text-accent" : "text-ink"}`}
                                        >
                                            <span className="truncate">{team.name}</span>
                                        </button>
                                    </td>
                                    <td className={`px-1 py-3 text-center font-mono ${isUserTeam ? "text-accent/60" : "text-gray-500"}`}>
                                        {team.matchesPlayed || 0}
                                    </td>
                                    <td className={`px-1 py-3 text-center font-mono ${isUserTeam ? "text-accent/60" : "text-gray-500"}`}>
                                        {team.wins || 0}
                                    </td>
                                    <td className={`px-1 py-3 text-center font-mono ${isUserTeam ? "text-accent/60" : "text-gray-500"}`}>
                                        {team.draws || 0}
                                    </td>
                                    <td className={`px-1 py-3 text-center font-mono ${isUserTeam ? "text-accent/60" : "text-gray-500"}`}>
                                        {team.losses || 0}
                                    </td>
                                    <td className={`px-1 py-3 text-center font-mono text-[10px] ${isUserTeam ? "text-accent/60" : "text-gray-500"}`}>
                                        {team.goalsFor || 0}-{team.goalsAgainst || 0}
                                    </td>
                                    <td className={`px-1 py-3 text-center font-mono ${isUserTeam ? "text-accent/60" : "text-gray-500"}`}>
                                        {team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference || 0}
                                    </td>
                                    <td className={`px-1 py-3 text-center font-black font-mono text-sm ${isUserTeam ? "text-accent bg-accent/10" : "text-ink bg-gray-50/30"}`}>
                                        {team.points || 0}
                                    </td>
                                </tr>
                            );
                        })}
					</tbody>
				</table>
				<div className="h-4" />
			</div>
		</div>
	);
}
