import { BoardObjectiveCard } from "@/components/Dashboard/BoardObjectiveCard";
import { type Team, db } from "@/db/db";
import { useGameStore } from "@/store/gameSlice";
import { Heart, Target, TrendingUp } from "lucide-preact";
import { useEffect, useState } from "preact/hooks";
import { useTranslation } from "react-i18next";

export default function BoardView() {
	const { t } = useTranslation();
	const userTeamId = useGameStore((state) => state.userTeamId);
	const [team, setTeam] = useState<Team | null>(null);
	const [position, setPosition] = useState(0);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const loadData = async () => {
			if (!userTeamId) return;
			const userTeam = await db.teams.get(userTeamId);
			setTeam(userTeam || null);
			if (userTeam) {
				const leagueTeams = await db.teams
					.where("leagueId")
					.equals(userTeam.leagueId)
					.toArray();
				leagueTeams.sort((a, b) => (b.points || 0) - (a.points || 0));
				setPosition(leagueTeams.findIndex((t) => t.id === userTeamId) + 1);
			}
			setIsLoading(false);
		};
		loadData();
	}, [userTeamId]);

	if (isLoading || !team) return null;

	return (
		<div className="space-y-6 animate-fade-in">
			{/* CONFIANCE DU BOARD */}
			<div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
				<h3 className="text-[10px] font-black uppercase tracking-widest text-ink-light mb-6 flex items-center gap-2">
					<Heart size={14} className={(team.confidence || 0) > 50 ? "text-green-500" : "text-red-500"} /> 
					Confiance de la Présidence
				</h3>
				<div className="flex justify-between items-end mb-2">
					<span className="text-4xl font-serif font-black text-ink">{team.confidence}%</span>
					<span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
						(team.confidence || 0) > 70 ? "bg-green-100 text-green-700" : 
						(team.confidence || 0) > 40 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
					}`}>
						{(team.confidence || 0) > 70 ? "Excellente" : (team.confidence || 0) > 40 ? "Stable" : "Critique"}
					</span>
				</div>
				<div className="h-2 bg-paper-dark rounded-full overflow-hidden border border-gray-100 shadow-inner">
					<div 
						className={`h-full transition-all duration-1000 ${
							(team.confidence || 0) > 70 ? "bg-green-500" : 
							(team.confidence || 0) > 40 ? "bg-amber-500" : "bg-red-500"
						}`}
						style={{ width: `${team.confidence || 0}%` }}
					/>
				</div>
			</div>

			{/* OBJECTIFS */}
			<div className="space-y-3">
				<h3 className="text-[10px] font-black uppercase tracking-widest text-ink-light px-2 flex items-center gap-2">
					<Target size={14} className="text-accent" /> Feuille de Route
				</h3>
				<BoardObjectiveCard team={team} position={position} />
			</div>

			{/* ANALYSE MANAGEMENT */}
			<div className="bg-paper-dark/50 p-6 rounded-3xl border border-white/50">
				<div className="flex items-center gap-3 mb-4">
					<TrendingUp size={16} className="text-accent" />
					<h4 className="text-[10px] font-black uppercase tracking-widest text-ink">Analyse du Board</h4>
				</div>
				<p className="text-sm text-ink-light leading-relaxed italic">
					"Le conseil d'administration surveille attentivement vos résultats. Le respect des objectifs fixés en début de saison est primordial pour conserver votre poste."
				</p>
			</div>
		</div>
	);
}
