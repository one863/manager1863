import { BoardObjectiveCard } from "@/ui/components/Dashboard/BoardObjectiveCard";
import { type Team, db } from "@/core/db/db";
import { useGameStore } from "@/infrastructure/store/gameSlice";
import { Heart, Target, TrendingUp, Award, UserCheck, ShieldAlert } from "lucide-preact";
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

	const confidence = team.confidence || 0;
	const isAtRisk = confidence < 30;

	return (
		<div className="space-y-6 animate-fade-in pb-20">
			{/* SECTION : ÉTAT DU MANDAT */}
			<section className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
				<div className="p-6">
					<div className="flex justify-between items-start mb-6">
						<div>
							<h3 className="text-[10px] font-black uppercase tracking-widest text-ink-light flex items-center gap-2 mb-1">
								<UserCheck size={14} className="text-accent" /> Votre Mandat
							</h3>
							<p className="text-xs text-ink-light italic">Point de situation avec la présidence</p>
						</div>
						<div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
							confidence > 70 ? "bg-green-50 text-green-600 border border-green-100" : 
							confidence > 40 ? "bg-amber-50 text-amber-600 border border-amber-100" : "bg-red-50 text-red-600 border border-red-100"
						}`}>
							{confidence > 70 ? "Soutien Total" : confidence > 40 ? "En Observation" : "Menacé"}
						</div>
					</div>

					<div className="flex items-center gap-6 mb-4">
						<div className="relative shrink-0">
							<svg className="w-20 h-20 transform -rotate-90">
								<circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-gray-100" />
								<circle 
									cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="6" fill="transparent" 
									strokeDasharray={226}
									strokeDashoffset={226 - (226 * confidence) / 100}
									className={`transition-all duration-1000 ${confidence > 70 ? "text-green-500" : confidence > 40 ? "text-amber-500" : "text-red-500"}`}
								/>
							</svg>
							<div className="absolute inset-0 flex items-center justify-center font-serif font-black text-xl text-ink">
								{confidence}%
							</div>
						</div>
						<div className="space-y-2 flex-1">
							<div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tighter">
								<span className="text-ink-light italic">Confiance</span>
								<span className="text-ink">{confidence}/100</span>
							</div>
							<div className="h-1.5 bg-gray-50 rounded-full overflow-hidden border border-gray-100">
								<div 
									className={`h-full transition-all duration-1000 ${confidence > 70 ? "bg-green-500" : confidence > 40 ? "bg-amber-500" : "bg-red-500"}`}
									style={{ width: `${confidence}%` }}
								/>
							</div>
							<p className="text-[10px] leading-relaxed text-ink-light mt-2 italic">
								{confidence > 70 ? "Le président est ravi de votre gestion. Vous avez carte blanche." : 
								 confidence > 30 ? "Vos résultats sont acceptables, mais la vigilance reste de mise." : 
								 "Le Conseil exige des résultats immédiats. Votre poste est en jeu."}
							</p>
						</div>
					</div>
				</div>

				{isAtRisk && (
					<div className="bg-red-50 px-6 py-3 border-t border-red-100 flex items-center gap-3">
						<ShieldAlert size={16} className="text-red-500" />
						<span className="text-[9px] font-black uppercase tracking-widest text-red-700 animate-pulse">
							Avertissement de licenciement imminent
						</span>
					</div>
				)}
			</section>

			{/* SECTION : OBJECTIFS DE SAISON */}
			<div className="space-y-3">
				<h3 className="text-[10px] font-black uppercase tracking-widest text-ink-light px-2 flex items-center gap-2">
					<Target size={14} className="text-accent" /> Feuille de Route Officielle
				</h3>
				<BoardObjectiveCard team={team} position={position} />
			</div>

			{/* SECTION : ANALYSE STRATÉGIQUE */}
			<div className="grid grid-cols-2 gap-4">
				<div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
					<Award size={16} className="text-accent mb-2" />
					<h4 className="text-[10px] font-black uppercase tracking-widest text-ink mb-1">Stabilité</h4>
					<p className="text-[10px] text-ink-light leading-tight italic">
						La pérennité du club repose sur votre capacité à maintenir un équilibre financier.
					</p>
				</div>
				<div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
					<TrendingUp size={16} className="text-accent mb-2" />
					<h4 className="text-[10px] font-black uppercase tracking-widest text-ink mb-1">Croissance</h4>
					<p className="text-[10px] text-ink-light leading-tight italic">
						Plus votre réputation augmente, plus le Conseil vous octroiera de liberté.
					</p>
				</div>
			</div>

			{/* MESSAGE DE LA PRÉSIDENCE */}
			<div className="bg-paper-dark/30 p-6 rounded-3xl border border-gray-200 border-dashed">
				<p className="text-sm text-ink-light leading-relaxed font-serif italic text-center">
					"Monsieur le Manager, souvenez-vous que vous n'êtes que le gardien de cette institution. Les archives se souviendront de vos victoires, mais le Conseil ne tolérera pas l'échec."
				</p>
			</div>
		</div>
	);
}
