import { GraduationCap, TrendingUp, Users, Zap } from "lucide-preact";
import { useTranslation } from "react-i18next";
import { useGameStore } from "@/infrastructure/store/gameSlice";
import { useEffect, useState } from "preact/hooks";
import { db } from "@/core/db/db";
import type { Team } from "@/core/engine/core/types";

export default function AcademyView() {
	const { t } = useTranslation();
	const userTeamId = useGameStore((state) => state.userTeamId);
	const [team, setTeam] = useState<Team | null>(null);

	useEffect(() => {
		if (userTeamId) {
			db.teams.get(userTeamId).then(setTeam);
		}
	}, [userTeamId]);

	return (
		<div className="space-y-6 animate-fade-in">
			{/* Status Card */}
			<div className="bg-paper-dark rounded-3xl p-6 border border-gray-200 relative overflow-hidden">
				<div className="absolute top-0 right-0 p-4 opacity-5 text-ink">
					<GraduationCap size={120} />
				</div>
				
				<div className="relative z-10">
					<div className="flex items-center gap-2 mb-1">
						<GraduationCap size={18} className="text-accent" />
						<h3 className="text-[10px] font-black uppercase tracking-widest text-ink-light">Centre de Formation</h3>
					</div>
					<h2 className="text-2xl font-serif font-black italic text-ink">Academy 1863</h2>
					
					<div className="mt-6 grid grid-cols-2 gap-4">
						<div className="bg-white p-3 rounded-2xl border border-gray-100">
							<p className="text-[9px] font-bold uppercase text-ink-light mb-1">Infrastructures</p>
							<p className="text-lg font-black text-ink">Niveau {team?.stadiumLevel || 1}</p>
						</div>
						<div className="bg-white p-3 rounded-2xl border border-gray-100">
							<p className="text-[9px] font-bold uppercase text-ink-light mb-1">Qualité Jeunes</p>
							<p className="text-lg font-black text-ink">Standard</p>
						</div>
					</div>
				</div>
			</div>

			{/* Info Section */}
			<div className="space-y-4">
				<div className="bg-white p-6 rounded-2xl border border-gray-100 flex gap-4 items-start shadow-sm">
					<div className="w-10 h-10 rounded-xl bg-paper-dark border border-gray-100 flex items-center justify-center text-accent shrink-0">
						<Zap size={20} />
					</div>
					<div className="space-y-1">
						<h4 className="text-sm font-bold text-ink">Bientôt disponible</h4>
						<p className="text-xs text-ink-light leading-relaxed">
							Nos recruteurs sillonnent actuellement la région à la recherche des talents de demain. 
							Les premiers rapports de détection arriveront bientôt.
						</p>
					</div>
				</div>

				<div className="bg-white p-6 rounded-2xl border border-gray-100 flex gap-4 items-start shadow-sm">
					<div className="w-10 h-10 rounded-xl bg-paper-dark border border-gray-100 flex items-center justify-center text-accent shrink-0">
						<Users size={20} />
					</div>
					<div className="space-y-1">
						<h4 className="text-sm font-bold text-ink">Promotion Interne</h4>
						<p className="text-xs text-ink-light leading-relaxed">
							Vous pourrez promouvoir les meilleurs jeunes de l'Academy directement dans votre équipe première.
						</p>
					</div>
				</div>

				<div className="bg-white p-6 rounded-2xl border border-gray-100 flex gap-4 items-start shadow-sm">
					<div className="w-10 h-10 rounded-xl bg-paper-dark border border-gray-100 flex items-center justify-center text-accent shrink-0">
						<TrendingUp size={20} />
					</div>
					<div className="space-y-1">
						<h4 className="text-sm font-bold text-ink">Investissement</h4>
						<p className="text-xs text-ink-light leading-relaxed">
							Plus vous investissez dans vos infrastructures, plus vous aurez de chances de sortir des joueurs de classe mondiale.
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
