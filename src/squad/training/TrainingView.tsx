import { db } from "@/core/db/db";
import { TrainingService } from "@/squad/training/training-service";
import { useGameStore } from "@/infrastructure/store/gameSlice";
import {
	Activity,
	Dumbbell,
	Shield,
	Target,
	Zap,
	Clock,
} from "lucide-preact";
import { useEffect, useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import Button from "@/ui/components/Common/Button";

type TrainingFocus = "GENERAL" | "PHYSICAL" | "ATTACK" | "DEFENSE" | "GK";

export default function Training() {
	const { t } = useTranslation();
	const userTeamId = useGameStore((state) => state.userTeamId);
	const currentDay = useGameStore((state) => state.day);
	const [activeFocus, setActiveFocus] = useState<TrainingFocus | null>(null);
	const [trainingEndDay, setTrainingEndDay] = useState<number | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const load = async () => {
			if (!userTeamId) return;
			const team = await db.teams.get(userTeamId);
			if (team) {
				setActiveFocus((team.trainingFocus as TrainingFocus) || null);
				setTrainingEndDay(team.trainingEndDay || null);
			}
			setIsLoading(false);
		};
		load();
	}, [userTeamId, currentDay]);

	const handleStartTraining = async (focus: TrainingFocus) => {
		if (!userTeamId) return;
		const res = await TrainingService.startTrainingCycle(
			userTeamId,
			focus,
			currentDay,
		);
		if (res.success) {
			setActiveFocus(focus);
			setTrainingEndDay(res.endDay!);
		}
	};

	const handleCancel = async () => {
		if (!userTeamId) return;
		await TrainingService.cancelTraining(userTeamId);
		setActiveFocus(null);
		setTrainingEndDay(null);
	};

	if (isLoading)
		return (
			<div className="flex flex-col items-center justify-center py-12 animate-pulse">
				<div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
				<p className="text-xs font-bold text-gray-600 uppercase tracking-widest">{t("game.loading")}</p>
			</div>
		);

	const timeLeft = trainingEndDay ? trainingEndDay - currentDay : 0;

	return (
		<div className="space-y-6 animate-fade-in p-4 bg-white min-h-full">
			{/* HEADER - CLEAN VERSION */}
			<div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 flex items-center justify-between">
				<div>
					<h2 className="text-xl font-bold text-gray-900">Entraînement</h2>
					<p className="text-gray-500 text-xs font-bold uppercase tracking-tight mt-1">
						Optimisation de la performance
					</p>
				</div>
				<div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-blue-600 border border-gray-100 shadow-sm">
					<Dumbbell size={24} />
				</div>
			</div>

			{activeFocus ? (
				<div className="bg-white border border-blue-100 rounded-2xl p-6 relative overflow-hidden text-center shadow-sm">
					<div className="absolute top-0 left-0 w-full h-1.5 bg-gray-100">
						<div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${Math.max(0, Math.min(100, ((7 - timeLeft) / 7) * 100))}%` }} />
					</div>
					
					<div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-100 text-blue-600">
						{activeFocus === "PHYSICAL" && <Activity size={32} />}
						{activeFocus === "ATTACK" && <Zap size={32} />}
						{activeFocus === "DEFENSE" && <Shield size={32} />}
						{activeFocus === "GENERAL" && <Target size={32} />}
						{activeFocus === "GK" && <Shield size={32} />}
					</div>

					<h3 className="text-lg font-bold text-gray-900 mb-1">Cycle {activeFocus}</h3>
					<div className="flex items-center justify-center gap-1.5 text-blue-600 mb-6">
						<Clock size={14} />
						<span className="text-xs font-bold uppercase tracking-widest">Fini dans {timeLeft} jours</span>
					</div>

					<button 
						onClick={handleCancel} 
						className="w-full py-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold uppercase tracking-widest border border-red-100 hover:bg-red-100 transition-colors"
					>
						Annuler l'entraînement
					</button>
				</div>
			) : (
				<div className="space-y-3">
					<h3 className="text-[10px] font-bold text-gray-600 uppercase tracking-widest px-1">Programmes disponibles</h3>
					<div className="grid grid-cols-1 gap-3">
						<TrainingCard
							title="Physique"
							icon={Activity}
							desc="Endurance & Vitesse"
							onClick={() => handleStartTraining("PHYSICAL")}
						/>
						<TrainingCard
							title="Attaque"
							icon={Zap}
							desc="Finition & Création"
							onClick={() => handleStartTraining("ATTACK")}
						/>
						<TrainingCard
							title="Défense"
							icon={Shield}
							desc="Tacles & Placement"
							onClick={() => handleStartTraining("DEFENSE")}
						/>
						<TrainingCard
							title="Général"
							icon={Target}
							desc="Équilibré"
							onClick={() => handleStartTraining("GENERAL")}
						/>
					</div>
				</div>
			)}
		</div>
	);
}

function TrainingCard({ title, icon: Icon, desc, onClick }: any) {
	return (
		<button
			onClick={onClick}
			className="bg-white p-4 rounded-xl border border-gray-100 flex items-center gap-4 hover:border-blue-200 hover:shadow-sm transition-all group text-left"
		>
			<div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center text-gray-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors border border-gray-100">
				<Icon size={22} />
			</div>
			<div className="flex-1">
				<h4 className="font-bold text-gray-900 text-sm">{title}</h4>
				<p className="text-[11px] text-gray-500 font-medium">{desc}</p>
			</div>
			<div className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
				<Target size={16} />
			</div>
		</button>
	);
}
