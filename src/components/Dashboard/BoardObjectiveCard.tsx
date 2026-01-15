import type { Team } from "@/engine/core/types";
import {
	AlertCircle,
	CalendarClock,
	ShieldAlert,
	Target,
	TrendingUp,
} from "lucide-preact";

interface BoardObjectiveProps {
	team: Team | null;
	position: number;
}

export function BoardObjectiveCard({ team, position }: BoardObjectiveProps) {
	if (!team) return null;

	const matchesPlayed = team.matchesPlayed || 0;
	// Période de grâce étendue à 6 matchs
	const isGracePeriod = matchesPlayed <= 6;

	const getObjectiveLabel = (goal?: string) => {
		switch (goal) {
			case "CHAMPION":
				return "Être Sacré Champion";
			case "PROMOTION":
				return "Obtenir la Promotion";
			case "MID_TABLE":
				return "Milieu de Tableau";
			case "AVOID_RELEGATION":
				return "Éviter la Relégation";
			default:
				return "Non défini";
		}
	};

	const getConfidenceColor = (val: number) => {
		if (val >= 80) return "text-green-600";
		if (val >= 50) return "text-amber-500";
		return "text-red-600";
	};

	const isAtRisk = () => {
		if (isGracePeriod) return false;

		if (!team.seasonGoal) return false;
		if (team.seasonGoal === "CHAMPION" && position > 2) return true;
		if (team.seasonGoal === "PROMOTION" && position > 5) return true;
		if (team.seasonGoal === "MID_TABLE" && position > 8) return true;
		if (team.seasonGoal === "AVOID_RELEGATION" && position > 8) return true;
		return false;
	};

	const showWarning = isAtRisk() && !isGracePeriod;

	const getStatusIcon = () => {
		if (isGracePeriod)
			return <CalendarClock className="text-ink-light" size={20} />;
		if (showWarning) return <ShieldAlert className="text-red-600" size={20} />;
		return <TrendingUp className="text-green-700" size={20} />;
	};

	const getStatusMessage = () => {
		if (isGracePeriod) {
			return (
				<div className="px-4 py-3 bg-paper-dark/30 border-t border-gray-100 flex items-start gap-3">
					<CalendarClock size={16} className="text-ink-light shrink-0 mt-0.5" />
					<p className="text-[10px] text-ink-light italic leading-snug font-medium">
						La saison ne fait que commencer. Le Conseil d'Administration attend
						de voir les premiers résultats avant de juger.
					</p>
				</div>
			);
		}

		if (showWarning) {
			return (
				<div className="px-4 py-3 bg-red-50 border-t border-red-100 flex items-start gap-3">
					<AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
					<p className="text-[10px] text-red-800 italic leading-snug font-medium">
						Le Conseil d'Administration n'est pas satisfait. Améliorez votre
						classement pour éviter le licenciement.
					</p>
				</div>
			);
		}

		return null;
	};

	return (
		<div className="bg-white rounded-[2rem] border-2 border-paper-dark shadow-sm overflow-hidden">
			<div className="bg-paper-dark/50 px-5 py-3 border-b border-gray-100 flex justify-between items-center">
				<h3 className="text-[10px] font-black text-ink-light uppercase tracking-widest flex items-center gap-1.5">
					<Target size={14} className="text-accent" />
					Objectif du Conseil
				</h3>
				{showWarning && (
					<span className="bg-red-100 text-red-800 text-[9px] font-bold px-2 py-0.5 rounded-full border border-red-200 uppercase tracking-tighter">
						Siège Éjectable
					</span>
				)}
				{isGracePeriod && (
					<span className="bg-white/50 text-ink-light text-[9px] font-bold px-2 py-0.5 rounded-full border border-gray-200 uppercase tracking-tighter">
						Début de Saison
					</span>
				)}
			</div>

			<div className="p-5 flex items-center gap-4">
				<div
					className={`p-3 rounded-2xl ${showWarning ? "bg-red-50" : isGracePeriod ? "bg-paper-dark" : "bg-green-50"}`}
				>
					{getStatusIcon()}
				</div>

				<div className="flex-1">
					<div className="font-serif font-bold text-lg text-ink leading-tight">
						{getObjectiveLabel(team.seasonGoal)}
					</div>
					<div className="text-[10px] font-black uppercase tracking-widest text-ink-light/50 mt-1">
						Position :{" "}
						<span
							className={`font-black ${showWarning ? "text-red-700" : "text-green-700"}`}
						>
							{position}e
						</span>
					</div>
				</div>

				<div className="text-right border-l border-gray-100 pl-4">
					<div className="text-[10px] text-ink-light uppercase font-black tracking-widest mb-1">
						Confiance
					</div>
					<div
						className={`text-2xl font-serif font-bold ${getConfidenceColor(team.confidence)}`}
					>
						{team.confidence}%
					</div>
				</div>
			</div>

			{getStatusMessage()}
		</div>
	);
}
