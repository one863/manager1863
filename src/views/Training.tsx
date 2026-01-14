import { db, type StaffMember, type Player } from "@/db/db";
import { TrainingService } from "@/services/training-service";
import { useGameStore } from "@/store/gameSlice";
import { AlertCircle, CheckCircle2, ChevronUp, Dumbbell, Briefcase, Users, Clock } from "lucide-preact";
import { useEffect, useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import PlayerAvatar from "@/components/PlayerAvatar";
import StaffCard from "@/components/StaffCard";

export default function Training() {
	const { t } = useTranslation();
	const currentSaveId = useGameStore((state) => state.currentSaveId);
	const userTeamId = useGameStore((state) => state.userTeamId);
	const currentDay = useGameStore((state) => state.day);

	const [activeTab, setActiveTab] = useState<"training" | "staff">("training");
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const [team, setTeam] = useState<any | null>(null);
	const [players, setPlayers] = useState<Player[]>([]);
	const [staff, setStaff] = useState<StaffMember[]>([]);
	const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
	const [isProcessing, setIsProcessing] = useState(false);

	const loadData = async () => {
		if (!userTeamId || !currentSaveId) return;
		const [teamData, playerData, staffData] = await Promise.all([
			db.teams.get(userTeamId),
			db.players
				.where("[saveId+teamId]")
				.equals([currentSaveId, userTeamId])
				.toArray(),
			db.staff
				.where("[saveId+teamId]")
				.equals([currentSaveId, userTeamId])
				.toArray(),
		]);
		
		if (teamData) setTeam(teamData);
		setPlayers(playerData.sort((a, b) => b.skill - a.skill));
		setStaff(staffData);
	};

	useEffect(() => {
		loadData();
	}, [userTeamId, currentSaveId, currentDay]);

	const handleStartTraining = async (focus: "PHYSICAL" | "TECHNICAL") => {
		if (!userTeamId) return;
		setIsProcessing(true);
		try {
			await TrainingService.startTrainingCycle(userTeamId, focus, currentDay);
			await loadData();
		} catch (error) {
			console.error("Training error:", error);
		} finally {
			setIsProcessing(false);
		}
	};

	if (!team) return null;

	if (selectedStaff) {
		return (
			<StaffCard 
				staff={selectedStaff} 
				onClose={() => setSelectedStaff(null)} 
				onStaffAction={loadData}
			/>
		);
	}

	const isTrainingProgrammed =
		team.trainingEndDay !== undefined && team.trainingFocus !== undefined;
	
	const daysUntilTraining = isTrainingProgrammed
		? (team.trainingEndDay as number) - currentDay
		: 0;

	return (
		<div className="space-y-6 animate-fade-in pb-24">
			{/* TABS */}
			<div className="px-2">
				<div className="flex bg-paper-dark rounded-xl p-1 border border-gray-200 shadow-inner">
					<button
						onClick={() => setActiveTab("training")}
						className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === "training" ? "bg-white text-accent shadow-sm" : "text-ink-light"}`}
					>
						<Dumbbell size={18} /> Entraînement
					</button>
					<button
						onClick={() => setActiveTab("staff")}
						className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === "staff" ? "bg-white text-accent shadow-sm" : "text-ink-light"}`}
					>
						<Briefcase size={18} /> Staff Technique
					</button>
				</div>
			</div>

			{activeTab === "training" ? (
				<div className="space-y-6 animate-fade-in">
					<div className="px-2">
						{isTrainingProgrammed ? (
							<div className="bg-black text-white p-6 rounded-2xl shadow-xl border-b-4 border-gray-800 relative overflow-hidden">
								<div className="absolute top-0 right-0 p-4 opacity-10">
									<Clock size={80} />
								</div>
								<div className="relative z-10">
									<div className="flex items-center gap-2 mb-2">
										<div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
										<span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
											Programme Hebdomadaire
										</span>
									</div>
									<h3 className="text-2xl font-serif font-bold mb-1">
										Focus {team.trainingFocus}
									</h3>
									<p className="text-sm text-gray-400 italic">
										Mise à jour des progrès au Jour {team.trainingEndDay}.
									</p>
									<div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-accent uppercase">
										<Clock size={12} />
										<span>Exécution dans {daysUntilTraining} jours</span>
									</div>
								</div>
							</div>
						) : (
							<div className="space-y-4">
								<div className="bg-accent/10 border border-accent/20 rounded-xl p-4 flex gap-3">
									<Clock size={20} className="text-accent shrink-0" />
									<p className="text-xs text-ink-light">
										Choisissez un axe de travail pour la semaine. Les résultats seront effectifs au début de la semaine prochaine (Jour {Math.ceil(currentDay / 7) * 7 + 1}).
									</p>
								</div>
								<div className="grid grid-cols-2 gap-4">
									<button
										onClick={() => handleStartTraining("PHYSICAL")}
										disabled={isProcessing}
										className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:border-black transition-all group flex flex-col items-center text-center gap-3 active:scale-95"
									>
										<div className="w-12 h-12 rounded-xl bg-paper-dark flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors">
											<ChevronUp size={24} />
										</div>
										<div>
											<span className="block font-serif font-bold text-ink">
												Physique
											</span>
											<span className="text-[9px] text-ink-light uppercase font-bold">
												Vitesse & Endurance
											</span>
										</div>
									</button>

									<button
										onClick={() => handleStartTraining("TECHNICAL")}
										disabled={isProcessing}
										className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:border-black transition-all group flex flex-col items-center text-center gap-3 active:scale-95"
									>
										<div className="w-12 h-12 rounded-xl bg-paper-dark flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors">
											<Dumbbell size={20} />
										</div>
										<div>
											<span className="block font-serif font-bold text-ink">
												Technique
											</span>
											<span className="text-[9px] text-ink-light uppercase font-bold">
												Passes & Tir
											</span>
										</div>
									</button>
								</div>
							</div>
						)}
					</div>

					<div className="space-y-3 px-2">
						<div className="flex justify-between items-center px-1">
							<h3 className="text-xs font-bold uppercase tracking-widest text-ink-light flex items-center gap-2">
								<Users size={14} /> État de l'Effectif
							</h3>
						</div>

						<div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100 overflow-hidden">
							{players.map((player) => (
								<div
									key={player.id}
									className="p-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
								>
									<div className="flex items-center gap-3">
										<PlayerAvatar dna={player.dna} size={36} />
										<div>
											<div className="font-bold text-ink text-sm">
												{player.lastName}
											</div>
											<div className="flex items-center gap-2">
												<span className="text-[9px] font-bold text-ink-light uppercase">
													{player.position}
												</span>
												<div className="flex items-center gap-1">
													<div className="w-12 h-1 bg-gray-100 rounded-full overflow-hidden">
														<div
															className={`h-full ${player.energy > 50 ? "bg-green-500" : "bg-orange-500"}`}
															style={{ width: `${player.energy}%` }}
														/>
													</div>
												</div>
											</div>
										</div>
									</div>

									<div className="flex items-center gap-4">
										<div className="text-right">
											<div className="text-xs font-mono font-bold text-ink">
												{player.skill}
											</div>
										</div>
										{player.energy > 80 ? (
											<CheckCircle2 size={16} className="text-green-500" />
										) : player.energy < 30 ? (
											<AlertCircle size={16} className="text-red-500" />
										) : null}
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			) : (
				<div className="space-y-6 animate-fade-in px-2">
					<div className="bg-accent/5 border border-accent/20 rounded-2xl p-4 flex gap-3">
						<AlertCircle size={20} className="text-accent shrink-0 mt-0.5" />
						<p className="text-xs text-ink-light leading-relaxed">
							Le staff technique améliore l'efficacité des entraînements et la sélection automatique des titulaires. 
							Recrutez de meilleurs experts sur le <span className="font-bold text-accent">Marché</span>.
						</p>
					</div>

					<div className="space-y-3">
						{["COACH", "SCOUT", "PHYSICAL_TRAINER"].map((role) => {
							const member = staff.find((s) => s.role === role);
							return (
								<div 
									key={role} 
									onClick={() => member && setSelectedStaff(member)}
									className={`bg-white rounded-2xl border border-gray-200 p-4 shadow-sm transition-all ${member ? "cursor-pointer hover:border-accent active:scale-[0.98]" : ""}`}
								>
									<div className="flex justify-between items-center">
										<div className="flex items-center gap-3">
											{member ? (
												<PlayerAvatar dna={`0-0-${member.skill % 5}-0`} isStaff size={48} className="shrink-0" />
											) : (
												<div className="p-2 bg-gray-50 text-gray-200 rounded-xl">
													<Briefcase size={20} />
												</div>
											)}
											<div>
												<h4 className="text-xs font-bold uppercase tracking-widest text-ink-light">
													{role.replace("_", " ")}
												</h4>
												<p className={`text-sm font-bold ${member ? "text-ink" : "text-gray-300 italic"}`}>
													{member ? member.name : "Poste Vacant"}
												</p>
											</div>
										</div>
										{member && (
											<div className="text-right">
												<div className="text-lg font-mono font-bold text-accent">{member.skill}</div>
												<div className="text-[8px] font-bold text-ink-light uppercase">Compétence</div>
											</div>
										)}
									</div>
								</div>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
}
