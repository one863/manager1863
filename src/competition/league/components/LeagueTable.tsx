import { db } from "@/core/db/db";
import { useGameStore } from "@/infrastructure/store/gameSlice";
import { ArrowLeft, ArrowRight, Trophy, Star } from "lucide-preact";
import { useEffect, useState } from "preact/hooks";
import { useTranslation } from "react-i18next";

export default function LeagueTable({
	initialLeagueId,
	saveId,
	onSelectTeam, 
}: { initialLeagueId: number; saveId: number; onSelectTeam?: (id: number) => void }) {
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
            } else if (allLeagues.length > 0) {
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
	}, [activeLeagueId]);

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
		<div className="flex flex-col h-full bg-white animate-fade-in">
			{/* Navigation entre les ligues (sans titre de page fixe) */}
			<div className="px-4 py-2 border-b border-gray-50 flex items-center justify-between sticky top-0 bg-white z-10">
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

			<div className="flex-1 overflow-y-auto">
				<table className="w-full text-left border-collapse">
					<thead className="bg-gray-50 sticky top-0 z-10 text-[9px] font-black uppercase tracking-widest text-gray-400">
						<tr>
							<th className="p-3 w-8 text-center">#</th>
							<th className="p-3">Club</th>
							<th className="p-3 text-center w-8">MJ</th>
							<th className="p-3 text-center w-8">Diff</th>
							<th className="p-3 text-center w-10 font-bold text-ink">Pts</th>
						</tr>
					</thead>
					<tbody className="text-sm">
						{teams.map((team, index) => {
                            const isUserTeam = team.id === userTeamId;
                            return (
                                <tr 
                                    key={team.id} 
                                    className={`
                                        border-b border-gray-50 last:border-0 transition-colors
                                        ${isUserTeam ? "bg-accent/5" : ""}
                                        ${!isUserTeam && index < 3 ? "bg-green-50/20" : ""}
                                        ${!isUserTeam && index >= teams.length - 3 ? "bg-red-50/20" : ""}
                                    `}
                                >
                                    <td className={`p-3 text-center font-bold ${isUserTeam ? "text-accent" : (index === 0 ? "text-amber-500" : "text-gray-400")}`}>
                                        {index + 1}
                                    </td>
                                    <td className={`p-3 font-bold truncate max-w-[120px] ${isUserTeam ? "text-accent" : "text-ink"}`}>
                                        <button 
                                            onClick={() => onSelectTeam?.(team.id)}
                                            className="hover:text-accent text-left transition-colors flex items-center gap-2"
                                        >
                                            {team.name}
                                            {isUserTeam && <Star size={10} fill="currentColor" />}
                                        </button>
                                    </td>
                                    <td className={`p-3 text-center font-mono text-[10px] ${isUserTeam ? "text-accent/60" : "text-gray-400"}`}>
                                        {team.matchesPlayed || 0}
                                    </td>
                                    <td className={`p-3 text-center font-mono text-[10px] ${isUserTeam ? "text-accent/60" : "text-gray-400"}`}>
                                        {team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference || 0}
                                    </td>
                                    <td className={`p-3 text-center font-black font-mono ${isUserTeam ? "text-accent bg-accent/10" : "text-ink bg-gray-50/30"}`}>
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
