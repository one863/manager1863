import Card from "@/ui/components/Common/Card";
import CreditAmount from "@/ui/components/Common/CreditAmount";
import { type Team, db } from "@/core/db/db";
import { useGameStore } from "@/infrastructure/store/gameSlice";
import {
	Calendar,
	Coins,
	TrendingUp,
	Clock,
	ShieldCheck,
	Plus,
	ArrowRight
} from "lucide-preact";
import { useEffect, useState } from "preact/hooks";
import { useTranslation } from "react-i18next";

export default function FinancesView() {
	const { t } = useTranslation();
	const userTeamId = useGameStore((state) => state.userTeamId);
	const currentDate = useGameStore((state) => state.currentDate);
	const day = useGameStore((state) => state.day);
	const [team, setTeam] = useState<Team | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [weeklyExpenses, setWeeklyExpenses] = useState({ players: 0, staff: 0, total: 0 });

	const loadData = async () => {
		if (!userTeamId) return;
		const teamData = await db.teams.get(userTeamId);
		setTeam(teamData || null);

		if (teamData) {
			const staff = await db.staff
				.where("[saveId+teamId]")
				.equals([teamData.saveId, userTeamId])
				.toArray();
			const totalStaffWage = staff.reduce((acc, s) => acc + s.wage, 0);

			const players = await db.players
				.where("[saveId+teamId]")
				.equals([teamData.saveId, userTeamId])
				.toArray();
			const totalPlayerWage = players.reduce((acc, p) => acc + Math.round(p.skill * 0.2), 0);

			setWeeklyExpenses({
				players: totalPlayerWage,
				staff: totalStaffWage,
				total: totalStaffWage + totalPlayerWage
			});
		}
		setIsLoading(false);
	};

	useEffect(() => {
		loadData();
	}, [userTeamId, currentDate, day]);

	const daysUntilPayout = 7 - (day % 7 || 7);

	if (isLoading || !team)
		return (
			<div className="p-8 text-center animate-pulse">{t("game.loading")}</div>
		);

	const activeSponsors = team.sponsors || [];
	const totalSponsorIncome = activeSponsors.reduce((acc, s) => acc + s.income, 0);
	const remainingSlots = Math.max(0, 3 - activeSponsors.length);
	const totalIncome = totalSponsorIncome + (team.pendingIncome || 0);
	const netWeekly = totalIncome - weeklyExpenses.total;

	return (
		<div className="animate-fade-in space-y-6">
			{/* Header Solde & Prochain Bilan */}
			<div className="bg-white border-2 border-paper-dark rounded-3xl p-6 text-ink shadow-sm space-y-6 relative overflow-hidden">
				{/* Background decorations */}
				<div className="absolute -right-4 -top-4 opacity-[0.03]">
					<Coins size={120} />
				</div>

				<div className="flex justify-between items-start relative z-10">
					<div>
						<p className="text-[10px] uppercase tracking-widest text-ink-light font-bold mb-1">Trésorerie Actuelle</p>
						<CreditAmount amount={team.budget} size="xl" color="text-ink" />
					</div>
					<div className="bg-paper-dark px-3 py-1.5 rounded-full border border-gray-100 flex items-center gap-2">
						<Clock size={14} className="text-accent" />
						<span className="text-[10px] font-bold uppercase tracking-wider text-ink-light">
							Bilan dans {daysUntilPayout === 0 ? "aujourd'hui" : `${daysUntilPayout} j`}
						</span>
					</div>
				</div>

				<div className="grid grid-cols-2 gap-4 pt-4 border-t border-paper-dark relative z-10">
					<div>
						<p className="text-[9px] uppercase tracking-widest text-ink-light font-bold mb-1">Recettes Hebdo (Est.)</p>
						<div className="flex items-center gap-1">
							<ArrowRight size={10} className="text-green-600 rotate-[-45deg]" />
							<CreditAmount amount={totalIncome} size="md" />
						</div>
					</div>
					<div>
						<p className="text-[9px] uppercase tracking-widest text-ink-light font-bold mb-1">Dépenses Hebdo</p>
						<div className="flex items-center gap-1">
							<ArrowRight size={10} className="text-red-600 rotate-[45deg]" />
							<CreditAmount amount={weeklyExpenses.total} size="md" />
						</div>
					</div>
				</div>

				<div className={`mt-4 p-3 rounded-2xl flex items-center justify-between relative z-10 ${netWeekly >= 0 ? "bg-green-50 border border-green-100" : "bg-red-50 border border-red-100"}`}>
					<span className="text-[10px] font-bold uppercase tracking-wider text-ink-light">Prévision Solde Semaine</span>
					<CreditAmount 
						amount={netWeekly} 
						size="md" 
						color={netWeekly >= 0 ? "text-green-700" : "text-red-700"} 
					/>
				</div>
			</div>

			{/* Détails Recettes & Dépenses */}
			<div className="grid grid-cols-1 gap-4">
				<Card className="bg-white/50 border-gray-100">
					<h3 className="text-[10px] font-black uppercase tracking-widest text-ink-light mb-4 flex items-center gap-2">
						<TrendingUp size={14} className="text-green-600" /> Détail Recettes
					</h3>
					<div className="space-y-3">
						<div className="flex justify-between items-center text-xs">
							<span className="text-ink-light italic">Contrats Sponsors ({activeSponsors.length})</span>
							<CreditAmount amount={totalSponsorIncome} size="sm" />
						</div>
						<div className="flex justify-between items-center text-xs">
							<span className="text-ink-light italic">Billetterie cumulée</span>
							<CreditAmount amount={team.pendingIncome || 0} size="sm" />
						</div>
					</div>
				</Card>

				<Card className="bg-white/50 border-gray-100">
					<h3 className="text-[10px] font-black uppercase tracking-widest text-ink-light mb-4 flex items-center gap-2">
						<TrendingUp size={14} className="text-red-600 rotate-180" /> Détail Dépenses
					</h3>
					<div className="space-y-3">
						<div className="flex justify-between items-center text-xs">
							<span className="text-ink-light italic">Masse salariale Joueurs</span>
							<CreditAmount amount={weeklyExpenses.players} size="sm" />
						</div>
						<div className="flex justify-between items-center text-xs">
							<span className="text-ink-light italic">Honoraires Staff</span>
							<CreditAmount amount={weeklyExpenses.staff} size="sm" />
						</div>
					</div>
				</Card>
			</div>

			{/* État des Sponsors */}
			<div className="space-y-3 pb-24">
				<h3 className="text-sm font-black uppercase tracking-widest text-ink-light px-2 flex items-center gap-2">
					<ShieldCheck size={16} className="text-accent" /> Partenaires ({activeSponsors.length}/3)
				</h3>

				<div className="grid grid-cols-1 gap-3">
					{activeSponsors.map((s, idx) => (
						<Card key={idx} className="border-l-4 border-l-accent bg-white">
							<div className="flex justify-between items-center">
								<div>
									<h4 className="font-bold text-base text-ink">
										{s.name}
									</h4>
									<div className="flex items-center gap-1 text-[10px] text-ink-light italic">
										<Calendar size={10} />
										Expire : Saison {s.expirySeason}, Jour {s.expiryDay}
									</div>
								</div>
								<div className="text-right">
									<div className="flex items-center gap-1 justify-end">
										<CreditAmount amount={s.income} size="md" />
									</div>
									<span className="text-[8px] block uppercase text-ink-light italic">
										par semaine
									</span>
								</div>
							</div>
						</Card>
					))}

					{Array.from({ length: remainingSlots }).map((_, idx) => (
						<div key={`empty-${idx}`} className="border-2 border-dashed border-ink/10 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 bg-ink/[0.02]">
							<div className="w-10 h-10 rounded-full bg-paper flex items-center justify-center text-ink/20 border border-ink/5">
								<Plus size={20} />
							</div>
							<p className="text-[10px] font-bold uppercase tracking-widest text-ink/20 text-center">
								Emplacement Disponible
							</p>
						</div>
					))}
				</div>
				
				{remainingSlots > 0 && (
					<p className="text-[10px] text-ink-light italic px-2 text-center mt-4">
						"Surveillez votre messagerie (Actus), nos agents prospectent activement pour remplir ces emplacements."
					</p>
				)}
			</div>
		</div>
	);
}
