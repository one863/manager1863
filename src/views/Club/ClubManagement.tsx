import Button from "@/components/Common/Button";
import Card from "@/components/Common/Card";
import CreditAmount from "@/components/Common/CreditAmount";
import { type Team, db } from "@/db/db";
import { ClubService } from "@/services/club-service";
import { useGameStore } from "@/store/gameSlice";
import {
	AlertTriangle,
	Award,
	Building2,
	ChevronRight,
	Clock,
	Construction,
	Hammer,
	Heart,
	Star,
	Users,
} from "lucide-preact";
import { useEffect, useState } from "preact/hooks";
import { useTranslation } from "react-i18next";

export default function ClubManagement() {
	const { t } = useTranslation();
	const userTeamId = useGameStore((state) => state.userTeamId);
	const currentDay = useGameStore((state) => state.day);
	const [team, setTeam] = useState<Team | null>(null);
	const [squadSize, setSquadSize] = useState(0);
	const [isLoading, setIsLoading] = useState(true);
	const [showProjectConfirm, setShowProjectConfirm] = useState<
		"UPGRADE" | "NEW_STADIUM" | null
	>(null);

	const loadClubData = async () => {
		if (!userTeamId) return;
		const teamData = await db.teams.get(userTeamId);
		setTeam(teamData || null);
		const players = await db.players.where("teamId").equals(userTeamId).count();
		setSquadSize(players);
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

	const ProgressBar = ({
		label,
		value,
		icon: Icon,
		color = "bg-accent",
	}: any) => (
		<div className="space-y-1.5">
			<div className="flex justify-between items-center text-[10px] uppercase font-black text-ink-light tracking-widest">
				<div className="flex items-center gap-2">
					<Icon size={14} />
					{label}
				</div>
				<span className="font-mono">{value}%</span>
			</div>
			<div className="h-2.5 bg-paper-dark rounded-full overflow-hidden border border-gray-100 shadow-inner">
				<div
					className={`h-full ${color} transition-all duration-700 ease-out`}
					style={{ width: `${value}%` }}
				/>
			</div>
		</div>
	);

	return (
		<div className="space-y-6 pb-24 animate-fade-in relative px-1">
			<div className="text-center space-y-1 px-4 mt-2">
				<h2 className="text-2xl font-serif font-bold text-ink leading-tight tracking-tight">
					{team.name}
				</h2>
				<div className="flex items-center justify-center gap-2 text-ink-light italic text-xs">
					<span className="font-serif">Fondation : 1863</span>
					<span className="w-1.5 h-1.5 bg-accent/20 rounded-full" />
					<span>Président : {team.presidentName || team.managerName}</span>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-4">
				<div className="bg-white rounded-3xl p-6 flex flex-col items-center text-center shadow-sm border border-gray-100 relative">
					<Users className="text-accent mb-4" size={28} />
					<div className="space-y-0.5">
						<span className="block text-2xl font-black text-ink tracking-tighter">
							{team.fanCount || 0}
						</span>
						<span className="block text-[9px] uppercase text-ink-light font-black tracking-widest opacity-60">
							Fans
						</span>
					</div>
				</div>

				<div className="bg-white rounded-3xl p-6 flex flex-col items-center text-center shadow-sm border border-gray-100 relative">
					<Star className="text-yellow-500 mb-4" size={28} />
					<div className="space-y-0.5">
						<span className="block text-2xl font-black text-ink tracking-tighter">
							{team.reputation || 0}
						</span>
						<span className="block text-[9px] uppercase text-ink-light font-black tracking-widest opacity-60">
							Reputation
						</span>
					</div>
				</div>
			</div>

			<Card title="Conseil d'Administration">
				<div className="space-y-6">
					<ProgressBar
						label="Soutien du Board"
						value={team.confidence || 0}
						icon={Heart}
						color={(team.confidence || 0) > 50 ? "bg-green-600" : "bg-red-500"}
					/>
					<div className="grid grid-cols-2 gap-4">
						<div className="flex items-center gap-3 p-3 bg-paper-dark/40 rounded-2xl border border-white/50 shadow-inner">
							<div className="p-2 bg-white rounded-lg text-accent shadow-sm">
								<Users size={16} />
							</div>
							<div>
								<span className="text-[9px] uppercase text-ink-light font-black block leading-none mb-1">
									Joueurs
								</span>
								<span className="font-bold text-sm text-ink">{squadSize}</span>
							</div>
						</div>
						<div className="flex items-center gap-3 p-3 bg-paper-dark/40 rounded-2xl border border-white/50 shadow-inner">
							<div className="p-2 bg-white rounded-lg text-yellow-600 shadow-sm">
								<Award size={16} />
							</div>
							<div>
								<span className="text-[9px] uppercase text-ink-light font-black block leading-none mb-1">
									Palmarès
								</span>
								<span className="font-bold text-sm text-ink">0</span>
							</div>
						</div>
					</div>
				</div>
			</Card>

			<Card title="Infrastructures">
				<div className="flex flex-col gap-4">
					<div className="flex items-start gap-4 p-2">
						<div className="bg-paper-dark p-4 rounded-3xl border border-gray-200 shadow-inner text-accent">
							<Building2 size={32} />
						</div>
						<div className="flex-1 pt-1">
							<h4 className="font-serif font-bold text-lg text-ink leading-tight">
								{team.stadiumName}
							</h4>
							<div className="flex items-center gap-3 text-xs text-ink-light mt-1.5 font-bold uppercase tracking-wider">
								<span className="bg-paper-dark px-2.5 py-1 rounded-full border border-gray-100">
									Niv. {stadiumLevel}
								</span>
								<span className="flex items-center gap-1">
									<Users size={12} className="opacity-50" />{" "}
									{team.stadiumCapacity} PLACES
								</span>
							</div>
						</div>
					</div>

					{isUpgrading ? (
						<div className="bg-accent/5 border-2 border-accent/20 rounded-2xl p-5 shadow-sm relative overflow-hidden">
							<div className="flex justify-between items-center mb-3">
								<div className="flex items-center gap-2">
									<Construction
										size={18}
										className="text-accent animate-spin-slow"
									/>
									<span className="text-xs font-black text-ink uppercase tracking-widest">
										{team.stadiumProject?.type === "NEW_STADIUM"
											? "Construction Nouveau Stade"
											: "Agrandissement en cours"}
									</span>
								</div>
								<div className="flex items-center gap-1 text-[10px] font-black text-accent bg-accent/10 px-2 py-1 rounded-full">
									<Clock size={10} /> {upgradeDaysLeft} J.
								</div>
							</div>
							<div className="h-2 bg-paper-dark rounded-full overflow-hidden shadow-inner">
								<div
									className="h-full bg-accent animate-pulse"
									style={{
										width: `${((totalDays - upgradeDaysLeft) / totalDays) * 100}%`,
									}}
								/>
							</div>
						</div>
					) : (
						<div className="space-y-3">
							<button
								onClick={() => setShowProjectConfirm("UPGRADE")}
								className="w-full bg-paper-dark hover:bg-gray-200 border border-gray-300 p-4 rounded-2xl flex items-center justify-between transition-all group active:scale-[0.98] shadow-sm"
							>
								<div className="flex items-center gap-4">
									<div className="p-2.5 bg-white rounded-xl group-hover:bg-accent group-hover:text-white transition-colors shadow-sm">
										<Construction size={20} />
									</div>
									<div className="text-left">
										<span className="block text-xs font-black text-ink uppercase tracking-widest">
											Agrandir les tribunes
										</span>
										<span className="text-[10px] text-ink-light italic opacity-60">
											+1000 places • 30 jours
										</span>
									</div>
								</div>
								<CreditAmount
									amount={upgradeCost}
									size="sm"
									color="text-accent font-black"
								/>
							</button>

							{stadiumLevel >= 2 && (
								<button
									onClick={() => setShowProjectConfirm("NEW_STADIUM")}
									className="w-full bg-white hover:bg-paper-dark border-2 border-accent/30 p-4 rounded-2xl flex items-center justify-between transition-all group active:scale-[0.98] shadow-sm"
								>
									<div className="flex items-center gap-4">
										<div className="p-2.5 bg-accent/10 text-accent rounded-xl group-hover:bg-accent group-hover:text-white transition-colors shadow-sm">
											<Hammer size={20} />
										</div>
										<div className="text-left">
											<span className="block text-xs font-black text-ink uppercase tracking-widest">
												Nouveau Stade Moderne
											</span>
											<span className="text-[10px] text-ink-light italic opacity-60">
												10 000 places • 60 jours
											</span>
										</div>
									</div>
									<CreditAmount
										amount={newStadiumCost}
										size="sm"
										color="text-accent font-black"
									/>
								</button>
							)}
						</div>
					)}
				</div>
			</Card>

			{showProjectConfirm && (
				<div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
					<div className="bg-white rounded-3xl p-8 shadow-2xl border-4 border-paper-dark max-w-sm w-full animate-slide-up text-center">
						<div className="bg-accent/10 p-5 rounded-full text-accent shadow-inner inline-block mb-4">
							{showProjectConfirm === "UPGRADE" ? (
								<Construction size={40} />
							) : (
								<Hammer size={40} />
							)}
						</div>
						<h3 className="text-xl font-serif font-bold text-ink mb-2">
							{showProjectConfirm === "UPGRADE"
								? "Lancer les travaux ?"
								: "Bâtir une nouvelle enceinte ?"}
						</h3>
						<p className="text-sm text-ink-light mb-6 px-2">
							Ce projet coûtera{" "}
							<span className="font-black text-accent">
								M
								{showProjectConfirm === "UPGRADE"
									? upgradeCost
									: newStadiumCost}
							</span>{" "}
							et durera{" "}
							<span className="font-black text-ink">
								{showProjectConfirm === "UPGRADE" ? "30" : "60"} jours
							</span>{" "}
							de saison.
						</p>
						<div className="flex gap-4">
							<button
								onClick={() => setShowProjectConfirm(null)}
								className="flex-1 py-4 bg-paper-dark rounded-2xl font-black text-[10px] uppercase tracking-widest text-ink-light"
							>
								ANNULER
							</button>
							<button
								onClick={() => handleStartProject(showProjectConfirm)}
								className="flex-1 py-4 bg-accent text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg"
							>
								CONFIRMER
							</button>
						</div>
					</div>
				</div>
			)}

			<Card title="Vision du Club">
				<div className="space-y-4 py-1">
					<div className="flex items-center gap-4 p-3 rounded-2xl bg-paper-dark/30 border border-white/50 group">
						<div
							className={`w-3 h-3 rounded-full shadow-sm ${team.reputation >= 50 ? "bg-green-500 animate-pulse" : "bg-red-500"}`}
						/>
						<div className="flex-1">
							<p className="text-[10px] text-ink-light font-black uppercase tracking-widest leading-none mb-1">
								Image de Marque
							</p>
							<p className="text-xs text-ink font-bold">
								Réputation stable (50+)
							</p>
						</div>
					</div>
					<div className="flex items-center gap-4 p-3 rounded-2xl bg-paper-dark/30 border border-white/50">
						<div className="w-3 h-3 rounded-full bg-accent shadow-sm" />
						<div className="flex-1">
							<p className="text-[10px] text-ink-light font-black uppercase tracking-widest leading-none mb-1">
								Ambition Sportive
							</p>
							<p className="text-xs text-ink font-bold uppercase tracking-tight">
								{team.seasonGoal
									? t(`season_goals.${team.seasonGoal}`)
									: t("season_goals.MID_TABLE")}
							</p>
						</div>
					</div>
				</div>
			</Card>
		</div>
	);
}
