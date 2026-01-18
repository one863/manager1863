import { type Team, db } from "@/core/db/db";
import { useGameStore } from "@/infrastructure/store/gameSlice";
import { Users, Star, TrendingUp, Heart } from "lucide-preact";
import { useEffect, useState } from "preact/hooks";
import { useTranslation } from "react-i18next";

export default function FansView() {
	const { t } = useTranslation();
	const userTeamId = useGameStore((state) => state.userTeamId);
	const [team, setTeam] = useState<Team | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const loadData = async () => {
			if (!userTeamId) return;
			const data = await db.teams.get(userTeamId);
			setTeam(data || null);
			setIsLoading(false);
		};
		loadData();
	}, [userTeamId]);

	if (isLoading || !team) return null;

	return (
		<div className="space-y-6 animate-fade-in">
			{/* RÉCAPITULATIF FANS */}
			<div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
				<div className="absolute top-0 right-0 p-4 opacity-5 text-blue-500">
					<Users size={80} />
				</div>
				<h3 className="text-[10px] font-black uppercase tracking-widest text-ink-light mb-4 flex items-center gap-2">
					<Users size={14} className="text-blue-500" /> Fan Base
				</h3>
				<div className="space-y-1">
					<div className="text-4xl font-serif font-black text-ink">
						{team.fanCount?.toLocaleString() || 0}
					</div>
					<p className="text-xs text-ink-light italic">
						Personnes prêtes à soutenir l'institution chaque semaine.
					</p>
				</div>
			</div>

			{/* RÉPUTATION */}
			<div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
				<div className="absolute top-0 right-0 p-4 opacity-5 text-amber-500">
					<Star size={80} />
				</div>
				<h3 className="text-[10px] font-black uppercase tracking-widest text-ink-light mb-4 flex items-center gap-2">
					<Star size={14} className="text-amber-500" /> Prestige Mondial
				</h3>
				<div className="flex items-baseline gap-2">
					<div className="text-4xl font-serif font-black text-ink">
						{team.reputation}
					</div>
					<span className="text-sm font-bold text-ink-light opacity-30">/ 100</span>
				</div>
				<div className="mt-4 h-2 bg-paper-dark rounded-full overflow-hidden border border-gray-100 shadow-inner">
					<div 
						className="h-full bg-amber-500 transition-all duration-1000"
						style={{ width: `${team.reputation}%` }}
					/>
				</div>
			</div>

			{/* ANALYSE */}
			<div className="bg-paper-dark/50 p-6 rounded-3xl border border-white/50">
				<div className="flex items-center gap-3 mb-4">
					<TrendingUp size={16} className="text-accent" />
					<h4 className="text-[10px] font-black uppercase tracking-widest text-ink">Dynamique Locale</h4>
				</div>
				<p className="text-sm text-ink-light leading-relaxed italic">
					"Monsieur, la réputation du club attire les meilleurs talents et les contrats publicitaires les plus juteux. Enchaîner les victoires est le seul moyen de faire grandir notre légende."
				</p>
			</div>
		</div>
	);
}
