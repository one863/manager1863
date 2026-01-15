import { db, type StaffMember, type Player } from "@/db/db";
import { TrainingService, type TrainingFocus } from "@/services/training-service";
import { useGameStore } from "@/store/gameSlice";
import { AlertCircle, Dumbbell, Clock, XCircle, ArrowUp, ArrowDown, Users, Shield, Target, Zap, Activity } from "lucide-preact";
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

	const handleStartTraining = async (focus: TrainingFocus) => {
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

	const hasStaffFor = (focus: TrainingFocus) => {
		if (focus === "PHYSICAL") return staff.some(s => s.role === "PHYSICAL_TRAINER");
		if (focus === "GENERAL") return staff.some(s => s.role === "COACH");
		if (focus === "ATTACK") return staff.some(s => s.role === "COACH" && s.specialty === "Attaque");
		if (focus === "DEFENSE") return staff.some(s => s.role === "COACH" && s.specialty === "Défense");
		if (focus === "GK") return staff.some(s => s.role === "COACH" && s.specialty === "Gardiens");
		return false;
	};

	const PROGRAMS: { id: TrainingFocus; name: string; desc: string; icon: any }[] = [
		{ id: "GENERAL", name: "Général", desc: "Toutes les stats", icon: Zap },
		{ id: "PHYSICAL", name: "Physique", desc: "Vitesse & Endurance", icon: Activity },
		{ id: "ATTACK", name: "Attaque", desc: "Tir & Technique", icon: Target },
		{ id: "DEFENSE", name: "Défense", desc: "Défense & Tête", icon: Shield },
		{ id: "GK", name: "Gardiens", desc: "Spécifique Gardiens", icon: Users },
	];

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
										Programme en cours
									</span>
								</div>
								<button 
									onClick={handleCancelTraining}
									disabled={isProcessing}
									className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors bg-white/80 shadow-sm"
								>
									<XCircle size={20} />
								</button>
							</div>
							<h3 className="text-2xl font-serif font-bold mb-1 text-ink">
								{team.trainingFocus}
							</h3>
							<p className="text-sm text-ink-light italic">
								Fin du cycle au Jour {team.trainingEndDay}.
							</p>
						</div>
					</div>
				) : (
					<div className="space-y-4">
						<div className="grid grid-cols-1 gap-3">
							{PROGRAMS.map((prog) => {
								const unlocked = hasStaffFor(prog.id);
								return (
									<button
										key={prog.id}
										onClick={() => unlocked && handleStartTraining(prog.id)}
										disabled={isProcessing || !unlocked}
										className={`flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${unlocked ? "bg-white border-gray-200 shadow-sm hover:border-accent active:scale-[0.98]" : "bg-gray-50 border-gray-100 opacity-60 cursor-not-allowed"}`}
									>
										<div className={`p-3 rounded-xl ${unlocked ? "bg-paper-dark text-accent" : "bg-gray-100 text-gray-400"}`}>
											<prog.icon size={24} />
										</div>
										<div className="flex-1">
											<div className="font-bold text-ink flex items-center gap-2">
												{prog.name}
												{!unlocked && <Clock size={12} className="text-gray-400" />}
											</div>
											<div className="text-[10px] text-ink-light uppercase font-bold tracking-tighter">{prog.desc}</div>
										</div>
										{!unlocked && (
											<div className="text-[9px] font-black text-red-400 uppercase tracking-widest bg-red-50 px-2 py-1 rounded">
												Staff Requis
											</div>
										)}
									</button>
								);
							})}
						</div>
					</div>
				)}
			</div>

			<div className="space-y-3 px-2 pb-24">
				<h3 className="text-[10px] font-black uppercase tracking-widest text-ink-light ml-1">Effectif</h3>
				<div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100 overflow-hidden">
					{players.map((player) => (
						<PlayerRow key={player.id} player={player} />
					))}
				</div>
			</div>
		</div>
	);

	const renderStaff = () => (
		<div className="space-y-6 animate-fade-in px-2 pb-24">
			<div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100 overflow-hidden">
				{["COACH", "SCOUT", "PHYSICAL_TRAINER"].map((role) => {
					const members = staff.filter((s) => s.role === role);
					return members.length > 0 ? (
						members.map(m => (
							<StaffRow key={m.id} staff={m} onSelect={onSelectStaff} />
						))
					) : (
						<div key={role} className="p-5 flex items-center gap-4 bg-gray-50/50">
							<div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-300">
								<Users size={24} />
							</div>
							<div>
								<div className="text-[10px] font-black text-ink-light uppercase tracking-widest">{role.replace("_", " ")}</div>
								<div className="text-sm font-bold text-gray-300 italic">Poste Vacant</div>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);

	return (
		<div className="animate-fade-in">
			{activeTab === "training" ? renderTraining() : renderStaff()}
		</div>
	);
}
