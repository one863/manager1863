import Card from "@/components/Common/Card";
import CreditAmount from "@/components/Common/CreditAmount";
import { type Team, db } from "@/db/db";
import { useGameStore } from "@/store/gameSlice";
import {
	Calendar,
	Coins,
	Handshake,
	TrendingUp,
	Wallet,
	Receipt,
	Clock,
	Home,
	ArrowUpCircle,
	Users
} from "lucide-preact";
import { useEffect, useState } from "preact/hooks";
import { useTranslation } from "react-i18next";

export default function SponsorsFinances() {
	const { t } = useTranslation();
	const userTeamId = useGameStore((state) => state.userTeamId);
	const currentDate = useGameStore((state) => state.currentDate);
	const day = useGameStore((state) => state.day);
	const [team, setTeam] = useState<Team | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [weeklyExpenses, setWeeklyExpenses] = useState({ players: 0, staff: 0, total: 0 });
	const [activeTab, setActiveTab] = useState<"finance" | "stadium">("finance");

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
			const totalPlayerWage = players.reduce((acc, p) => acc + p.wage, 0);

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

	return (
		<div className="animate-fade-in pb-24">
			{/* ONGLETS FINANCE / STADE */}
			<div className="flex bg-paper-dark rounded-xl p-1 mb-6 border border-gray-200 shadow-inner">
				<button
					onClick={() => setActiveTab("finance")}
					className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === "finance" ? "bg-white text-accent shadow-sm" : "text-ink-light"}`}
				>
					<Coins size={18} /> Finances
				</button>
				<button
					onClick={() => setActiveTab("stadium")}
					className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === "stadium" ? "bg-white text-accent shadow-sm" : "text-ink-light"}`}
				>
					<Home size={18} /> Stade
				</button>
			</div>

			{activeTab === "finance" ? (
				<div className="space-y-6">
					<div className="flex items-center justify-between px-2">
						<div className="flex items-center gap-2">
							<Coins className="text-accent" />
							<h2 className="text-xl font-serif font-bold text-ink">
								Trésorerie
							</h2>
						</div>
						<div className="flex items-center gap-2 bg-ink/5 px-3 py-1 rounded-full">
							<Clock size={14} className="text-ink-light" />
							<span className="text-xs font-bold text-ink-light">
								Bilan dans {daysUntilPayout === 0 ? "aujourd'hui" : `${daysUntilPayout} j`}
							</span>
						</div>
					</div>

					{/* Solde Actuel */}
					<Card className="bg-ink text-paper border-none shadow-xl">
						<div className="flex justify-between items-center">
							<div>
								<p className="text-[10px] uppercase tracking-widest opacity-70">Budget Actuel</p>
								<CreditAmount amount={team.budget} size="xl" color="text-paper" />
							</div>
							<div className="text-right">
								<Clock className="text-accent opacity-50 ml-auto" size={24} />
							</div>
						</div>
					</Card>

					{/* Prévisions de la semaine */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Card title="Recettes Hebdo (Est.)">
							<div className="space-y-3">
								<div className="flex justify-between items-center">
									<div className="flex items-center gap-2 text-sm text-ink-light">
										<Handshake size={14} />
										Sponsor (fixe)
									</div>
									<CreditAmount amount={team.sponsorIncome || 0} size="sm" />
								</div>
								<div className="flex justify-between items-center">
									<div className="flex items-center gap-2 text-sm text-ink-light">
										<Receipt size={14} />
										Billetterie (en attente)
									</div>
									<CreditAmount amount={team.pendingIncome || 0} size="sm" />
								</div>
								<div className="pt-2 border-t border-ink/5 flex justify-between items-center font-bold">
									<span>Total Recettes</span>
									<CreditAmount amount={(team.sponsorIncome || 0) + (team.pendingIncome || 0)} size="md" color="text-green-700" />
								</div>
							</div>
						</Card>

						<Card title="Dépenses Hebdo">
							<div className="space-y-3">
								<div className="flex justify-between items-center">
									<div className="flex items-center gap-2 text-sm text-ink-light">
										<TrendingUp size={14} />
										Salaires Joueurs
									</div>
									<CreditAmount amount={weeklyExpenses.players} size="sm" />
								</div>
								<div className="flex justify-between items-center">
									<div className="flex items-center gap-2 text-sm text-ink-light">
										<Wallet size={14} />
										Salaires Staff
									</div>
									<CreditAmount amount={weeklyExpenses.staff} size="sm" />
								</div>
								<div className="pt-2 border-t border-ink/5 flex justify-between items-center font-bold">
									<span>Total Dépenses</span>
									<CreditAmount amount={weeklyExpenses.total} size="md" color="text-red-700" />
								</div>
							</div>
						</Card>
					</div>

					{/* État du Sponsor */}
					<Card title="Partenariat Principal">
						{team.sponsorName ? (
							<div className="flex justify-between items-center">
								<div>
									<h4 className="font-bold text-lg text-accent">
										{team.sponsorName}
									</h4>
									<div className="flex items-center gap-1 text-xs text-ink-light italic">
										<Calendar size={12} />
										{team.sponsorExpirySeason && team.sponsorExpiryDay ? (
											<span>Expire : Saison {team.sponsorExpirySeason}, Jour {team.sponsorExpiryDay}</span>
										) : (
											<span>Contrat Indéterminé</span>
										)}
									</div>
								</div>
								<div className="text-right">
									<div className="flex items-center gap-1 justify-end">
										<CreditAmount amount={team.sponsorIncome || 0} size="lg" />
									</div>
									<span className="text-[10px] block uppercase text-ink-light italic">
										Versé chaque semaine
									</span>
								</div>
							</div>
						) : (
							<div className="text-center py-8 italic text-ink-light flex flex-col items-center gap-4">
								<Handshake size={48} className="opacity-10" />
								<div className="space-y-1">
									<p className="font-bold text-ink">Aucun contrat actif</p>
									<p className="text-xs">Surveillez vos dépêches (News) pour des offres de partenariat.</p>
								</div>
							</div>
						)}
					</Card>
				</div>
			) : (
				<div className="space-y-6">
					<div className="flex items-center gap-2 px-2">
						<Home className="text-accent" />
						<h2 className="text-xl font-serif font-bold text-ink">
							Infrastructures
						</h2>
					</div>

					<Card>
						<div className="flex items-start gap-4">
							<div className="w-16 h-16 bg-paper-dark rounded-2xl flex items-center justify-center border border-gray-100 shrink-0 shadow-inner">
								<Home size={32} className="text-accent" />
							</div>
							<div className="flex-1">
								<h3 className="text-xl font-serif font-bold text-ink">{team.stadiumName}</h3>
								<div className="flex items-center gap-2 mt-1">
									<span className="bg-paper-dark px-2 py-0.5 rounded text-[10px] font-bold text-ink-light border border-gray-100 uppercase tracking-widest">
										Niveau {team.stadiumLevel}
									</span>
									<span className="text-xs text-ink-light font-bold">
										Capacité : {team.stadiumCapacity.toLocaleString()} places
									</span>
								</div>
							</div>
						</div>
					</Card>

					<div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
						<h3 className="text-sm font-black uppercase tracking-widest text-ink-light mb-4 flex items-center gap-2">
							<ArrowUpCircle size={16} className="text-accent" /> Amélioration
						</h3>
						
						<div className="space-y-6">
							<p className="text-sm text-ink-light leading-relaxed italic">
								"Monsieur, un stade plus grand signifie plus de recettes de billetterie chaque semaine de match à domicile. Cependant, les travaux sont coûteux et prennent du temps."
							</p>
							
							<div className="p-4 bg-paper-dark rounded-xl border border-gray-100">
								<div className="flex justify-between items-center mb-4">
									<div>
										<h4 className="font-bold text-ink">Extension des tribunes</h4>
										<p className="text-[10px] text-ink-light uppercase font-bold">Niveau {team.stadiumLevel + 1}</p>
									</div>
									<div className="text-right">
										<CreditAmount amount={team.stadiumLevel * 500} size="md" color="text-accent" />
									</div>
								</div>
								
								<div className="flex items-center gap-4 text-xs text-ink-light mb-6">
									<div className="flex items-center gap-1">
										<Users size={14} /> +{(team.stadiumLevel * 200)} places
									</div>
									<div className="flex items-center gap-1">
										<Clock size={14} /> 14 jours de travaux
									</div>
								</div>

								<button 
									disabled={team.budget < (team.stadiumLevel * 500)}
									className={`w-full py-3 rounded-xl font-bold text-sm transition-all shadow-sm ${team.budget >= (team.stadiumLevel * 500) ? "bg-accent text-white hover:bg-accent-dark active:scale-[0.98]" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
								>
									{team.budget >= (team.stadiumLevel * 500) ? "Lancer les travaux" : "Fonds insuffisants"}
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
