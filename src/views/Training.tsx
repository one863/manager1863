import { db, type StaffMember, type Player } from "@/db/db";
import { TrainingService } from "@/services/training-service";
import { useGameStore } from "@/store/gameSlice";
import { AlertCircle, ChevronUp, Dumbbell, Clock, XCircle, ArrowUp, ArrowDown, Users } from "lucide-preact";
import { useEffect, useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import { PlayerRow, StaffRow } from "@/views/Squad";

export default function Training({ 
	initialTab = "training", 
	onSelectStaff 
}: { 
	initialTab?: "training" | "staff",
	onSelectStaff?: (s: StaffMember) => void
}) {
	const { t } = useTranslation();
	const currentSaveId = useGameStore((state) => state.currentSaveId);
	const userTeamId = useGameStore((state) => state.userTeamId);
	const currentDay = useGameStore((state) => state.day);

	const [activeTab, setActiveTab] = useState<"training" | "staff">(initialTab);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const [team, setTeam] = useState<any | null>(null);
	const [players, setPlayers] = useState<Player[]>([]);
	const [staff, setStaff] = useState<StaffMember[]>([]);
	const [isProcessing, setIsProcessing] = useState(false);

	useEffect(() => {
		setActiveTab(initialTab);
	}, [initialTab]);

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

	const handleCancelTraining = async () => {
		if (!userTeamId) return;
		setIsProcessing(true);
		try {
			await TrainingService.cancelTraining(userTeamId);
			await loadData();
		} catch (error) {
			console.error("Cancel training error:", error);
		} finally {
			setIsProcessing(false);
		}
	};

	if (!team) return null;

	const isTrainingProgrammed =
		team.trainingEndDay !== undefined && team.trainingFocus !== undefined;
	
	const daysUntilTraining = isTrainingProgrammed
		? (team.trainingEndDay as number) - currentDay
		: 0;

	const renderTraining = () => (
		<div className="space-y-6 animate-fade-in">
			<div className="px-2">
				{isTrainingProgrammed ? (
					<div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 relative overflow-hidden">
						<div className="absolute top-0 right-0 p-4 opacity-5 text-accent pointer-events-none">
							<Clock size={80} />
						</div>
						<div className="relative z-10">
							<div className="flex justify-between items-start">
								<div className="flex items-center gap-2 mb-2">
									<div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
									<span className="text-[10px] font-bold uppercase tracking-widest text-ink-light">
										Programme Hebdomadaire
									</span>
								</div>
								<button 
									onClick={handleCancelTraining}
									disabled={isProcessing}
									className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors bg-white/80 shadow-sm"
									title="Annuler l'entraînement"
								>
									<XCircle size={20} />
								</button>
							</div>
							<h3 className="text-2xl font-serif font-bold mb-1 text-ink">
								Focus {team.trainingFocus}
							</h3>
							<p className="text-sm text-ink-light italic">
								Mise à jour des progrès au Jour {team.trainingEndDay}.
							</p>
							<div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-accent uppercase tracking-wider">
								<Clock size={12} />
								<span>Exécution dans {daysUntilTraining} jours</span>
							</div>
						</div>
					</div>
				) : (
					<div className="space-y-4">
						<div className="bg-accent/10 border border-accent/20 rounded-xl p-4 flex gap-3">
							<Clock size={20} className="text-accent shrink-0 mt-0.5" />
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
								<div className="w-12 h-12 rounded-xl bg-paper-dark flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-colors">
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
								<div className="w-12 h-12 rounded-xl bg-paper-dark flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-colors">
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

			<div className="space-y-3 px-2 pb-24">
				<div className="flex justify-between items-center px-1">
					<h3 className="text-xs font-bold uppercase tracking-widest text-ink-light flex items-center gap-2">
						Effectif
					</h3>
				</div>

				<div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100 overflow-hidden">
					{players.map((player) => (
						<PlayerRow 
							key={player.id} 
							player={player} 
							action={
								<div className="flex items-center w-4 justify-center">
									{player.lastTrainingSkillChange !== undefined && player.lastTrainingSkillChange > 0 && (
										<ArrowUp size={12} className="text-green-500 animate-bounce" />
									)}
									{player.lastTrainingSkillChange !== undefined && player.lastTrainingSkillChange < 0 && (
										<ArrowDown size={12} className="text-red-500 animate-bounce" />
									)}
								</div>
							}
						/>
					))}
				</div>
			</div>
		</div>
	);

	const renderStaff = () => (
		<div className="space-y-6 animate-fade-in px-2 pb-24">
			<div className="bg-accent/5 border border-accent/20 rounded-2xl p-4 flex gap-3">
				<AlertCircle size={20} className="text-accent shrink-0 mt-0.5" />
				<p className="text-xs text-ink-light leading-relaxed">
					Le staff technique améliore l'efficacité des entraînements. 
					Recrutez de meilleurs experts sur le <span className="font-bold text-accent">Marché</span>.
				</p>
			</div>

			<div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100 overflow-hidden">
				{["COACH", "SCOUT", "PHYSICAL_TRAINER"].map((role) => {
					const member = staff.find((s) => s.role === role);
					return member ? (
						<StaffRow 
							key={role} 
							staff={member} 
							onSelect={onSelectStaff}
							action={
								member.lastSkillChange !== undefined && member.lastSkillChange > 0 ? (
									<ArrowUp size={16} className="text-green-500 animate-bounce" />
								) : undefined
							}
						/>
					) : (
						<div key={role} className="p-4 flex items-center gap-3 bg-gray-50/50">
							<div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-300">
								<Users size={20} />
							</div>
							<div>
								<div className="text-[10px] font-bold text-ink-light uppercase tracking-widest">{role.replace("_", " ")}</div>
								<div className="text-sm font-bold text-gray-300 italic">Poste Vacant</div>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);

	return (
		<div className="space-y-6 animate-fade-in relative">
			{activeTab === "training" ? renderTraining() : renderStaff()}
		</div>
	);
}
