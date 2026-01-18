import CreditAmount from "@/ui/components/Common/CreditAmount";
import { type Team, db } from "@/core/db/db";
import { ClubService } from "@/club/club-service";
import { useGameStore } from "@/infrastructure/store/gameSlice";
import {
	Building2,
	Clock,
	Construction,
	Hammer,
	X
} from "lucide-preact";
import { useEffect, useState } from "preact/hooks";
import { useTranslation } from "react-i18next";

export default function InfrastructureView() {
	const { t } = useTranslation();
	const userTeamId = useGameStore((state) => state.userTeamId);
	const currentDay = useGameStore((state) => state.day);
	const [team, setTeam] = useState<Team | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [showProjectConfirm, setShowProjectConfirm] = useState<
		"UPGRADE" | "NEW_STADIUM" | null
	>(null);

	const loadClubData = async () => {
		if (!userTeamId) return;
		const teamData = await db.teams.get(userTeamId);
		setTeam(teamData || null);
		setIsLoading(false);
	};

	useEffect(() => {
		loadClubData();
	}, [userTeamId, currentDay]);

	const handleStartProject = async (type: "UPGRADE" | "NEW_STADIUM") => {
		if (!userTeamId) return;
		const result = await ClubService.startStadiumProject(
			userTeamId,
			currentDay,
			type,
		);
		if (result.success) {
			setShowProjectConfirm(null);
			await loadClubData();
		} else {
			alert(result.error);
		}
	};

	if (isLoading || !team)
		return (
			<div className="p-8 text-center animate-pulse">{t("game.loading")}</div>
		);

	const stadiumLevel = team.stadiumLevel || 1;
	const upgradeCost = stadiumLevel * stadiumLevel * 1000;
	const newStadiumCost = 10000;

	const isUpgrading =
		team.stadiumUpgradeEndDay && team.stadiumUpgradeEndDay > currentDay;
	const upgradeDaysLeft = isUpgrading
		? team.stadiumUpgradeEndDay! - currentDay
		: 0;
	const totalDays = team.stadiumProject?.type === "NEW_STADIUM" ? 60 : 30;

	return (
		<div className="space-y-6 animate-fade-in">
			{/* VISUEL STADE ET INFOS */}
			<div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
				<div className="bg-paper-dark p-8 flex flex-col items-center justify-center relative overflow-hidden">
					<div className="absolute inset-0 opacity-10 flex items-center justify-center">
						<Building2 size={120} />
					</div>
					
					<div className="relative z-10 flex flex-col items-center gap-2">
						<div className="bg-white p-4 rounded-full shadow-lg border-2 border-accent/20">
							<Building2 size={48} className="text-accent" />
						</div>
						<h3 className="text-xl font-serif font-black text-ink text-center leading-tight">
							{team.stadiumName}
						</h3>
						<div className="flex gap-2">
							<span className="px-2.5 py-1 bg-accent text-white text-[9px] font-black rounded-full uppercase tracking-widest shadow-sm">
								Niveau {stadiumLevel}
							</span>
							<span className="px-2.5 py-1 bg-white text-ink-light text-[9px] font-black rounded-full uppercase tracking-widest border border-gray-200">
								{team.stadiumCapacity.toLocaleString()} Places
							</span>
						</div>
					</div>
				</div>

				<div className="p-6 space-y-6">
					{isUpgrading ? (
						<div className="bg-accent/5 border-2 border-accent/20 border-dashed rounded-2xl p-5 relative overflow-hidden">
							<div className="flex justify-between items-center mb-3">
								<div className="flex items-center gap-2">
									<Construction size={18} className="text-accent animate-bounce" />
									<span className="text-[10px] font-black text-ink uppercase tracking-widest">
										Projet en cours...
									</span>
								</div>
								<div className="flex items-center gap-1 text-[10px] font-black text-accent bg-white px-2 py-1 rounded-full border border-accent/10">
									<Clock size={10} /> {upgradeDaysLeft} J.
								</div>
							</div>
							<div className="h-1.5 bg-paper-dark rounded-full overflow-hidden shadow-inner">
								<div
									className="h-full bg-accent transition-all duration-1000"
									style={{ width: `${((totalDays - upgradeDaysLeft) / totalDays) * 100}%` }}
								/>
							</div>
						</div>
					) : (
						<div className="space-y-3">
							<h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-ink-light opacity-50 px-1">
								Développement Infrastructure
							</h4>
							<button
								onClick={() => setShowProjectConfirm("UPGRADE")}
								className="w-full bg-paper-dark hover:bg-gray-200 p-4 rounded-2xl flex items-center justify-between transition-all group active:scale-[0.98] border border-transparent hover:border-accent/20"
							>
								<div className="flex items-center gap-4">
									<div className="p-2.5 bg-white rounded-xl text-accent shadow-sm group-hover:scale-110 transition-transform">
										<Construction size={20} />
									</div>
									<div className="text-left">
										<span className="block text-xs font-black text-ink uppercase tracking-widest">Agrandir</span>
										<span className="text-[9px] text-ink-light italic opacity-60">
											+1000 places • 30 jours
										</span>
									</div>
								</div>
								<CreditAmount amount={upgradeCost} size="sm" color="text-accent font-black" />
							</button>

							{stadiumLevel >= 2 && (
								<button
									onClick={() => setShowProjectConfirm("NEW_STADIUM")}
									className="w-full bg-white border border-gray-100 p-4 rounded-2xl flex items-center justify-between transition-all group active:scale-[0.98] hover:border-accent/30 shadow-sm"
								>
									<div className="flex items-center gap-4">
										<div className="p-2.5 bg-accent/10 text-accent rounded-xl group-hover:scale-110 transition-transform">
											<Hammer size={20} />
										</div>
										<div className="text-left">
											<span className="block text-xs font-black text-ink uppercase tracking-widest">Nouveau Stade</span>
											<span className="text-[9px] text-ink-light italic opacity-60">
												Modernisation totale • 60 jours
											</span>
										</div>
									</div>
									<CreditAmount amount={newStadiumCost} size="sm" color="text-accent font-black" />
								</button>
							)}
						</div>
					)}
				</div>
			</div>

			{/* MODAL CONFIRMATION (STYLE PLAYER CARD) */}
			{showProjectConfirm && (
				<div className="fixed inset-0 z-[250] bg-black/40 backdrop-blur-sm flex items-end justify-center animate-fade-in">
					<div className="bg-white rounded-t-[2rem] w-full max-w-lg animate-slide-up overflow-hidden">
						<div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold text-gray-900">Confirmation de projet</h3>
                                <button onClick={() => setShowProjectConfirm(null)} className="text-gray-400">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 mb-6 flex flex-col items-center text-center">
                                <div className="bg-white p-4 rounded-full shadow-sm border border-blue-100 mb-4">
                                    {showProjectConfirm === "UPGRADE" ? <Construction size={32} className="text-blue-600" /> : <Hammer size={32} className="text-blue-600" />}
                                </div>
                                <h4 className="font-bold text-blue-900 mb-1">
                                    {showProjectConfirm === "UPGRADE" ? "Agrandissement de la tribune" : "Nouveau Complexe Sportif"}
                                </h4>
                                <p className="text-xs text-blue-700/70 font-medium">
                                    {showProjectConfirm === "UPGRADE" ? "Ajout de 1000 places assises" : "Modernisation complète des infrastructures"}
                                </p>
                            </div>

                            <div className="space-y-3 mb-8">
                                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Coût du projet</span>
                                    <CreditAmount amount={showProjectConfirm === "UPGRADE" ? upgradeCost : newStadiumCost} size="md" color="text-gray-900 font-black" />
                                </div>
                                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Durée des travaux</span>
                                    <span className="text-sm font-bold text-gray-900">{showProjectConfirm === "UPGRADE" ? "30" : "60"} jours</span>
                                </div>
                            </div>
                            
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setShowProjectConfirm(null)} 
                                    className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl text-[11px] font-bold uppercase tracking-widest"
                                >
                                    Annuler
                                </button>
                                <button 
                                    onClick={() => handleStartProject(showProjectConfirm)} 
                                    className="flex-1 py-4 bg-blue-600 text-white rounded-2xl text-[11px] font-bold uppercase tracking-widest shadow-lg shadow-blue-200 active:scale-95 transition-transform"
                                >
                                    Confirmer les travaux
                                </button>
                            </div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
