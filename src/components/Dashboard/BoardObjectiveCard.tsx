import type { Team } from "@/db/db";
import {
	AlertCircle,
	CalendarClock,
	ShieldAlert,
	Target,
	TrendingUp,
	Trophy,
} from "lucide-preact";

interface BoardObjectiveProps {
	team: Team | null;
	position: number;
}

export function BoardObjectiveCard({ team, position }: BoardObjectiveProps) {
	if (!team) return null;

	const matchesPlayed = team.matchesPlayed || 0;
	// Période de grâce étendue à 6 matchs (cohérent avec la clémence du moteur)
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
		// Pas de risque pendant la période de grâce
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
			return <CalendarClock className="text-gray-600" size={20} />;
		if (showWarning) return <ShieldAlert className="text-red-600" size={20} />;
		return <TrendingUp className="text-green-700" size={20} />;
	};

	const getStatusMessage = () => {
		if (isGracePeriod) {
			return (
				<div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-start gap-3">
					<CalendarClock size={16} className="text-gray-500 shrink-0 mt-0.5" />
					<p className="text-xs text-gray-600 italic leading-snug font-medium">
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
					<p className="text-xs text-red-800 italic leading-snug font-medium">
						Le Conseil d'Administration n'est pas satisfait. Améliorez votre
						classement pour éviter le licenciement.
					</p>
				</div>
			);
		}

		return null;
	};

	return (
		<div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
			<div className="bg-paper-dark px-4 py-2 border-b border-gray-200 flex justify-between items-center">
				<h3 className="text-[10px] font-bold text-ink-light uppercase tracking-widest flex items-center gap-1.5">
					<Target size={14} className="text-black" />
					Objectif du Conseil
				</h3>
				{showWarning && (
					<span className="bg-red-100 text-red-800 text-[9px] font-bold px-2 py-0.5 rounded-full animate-pulse border border-red-200">
						SIÈGE ÉJECTABLE
					</span>
				)}
				{isGracePeriod && (
					<span className="bg-gray-100 text-gray-600 text-[9px] font-bold px-2 py-0.5 rounded-full border border-gray-200">
						DÉBUT DE SAISON
					</span>
				)}
			</div>

			<div className="p-4 flex items-center gap-4">
				<div
					className={`p-3 rounded-xl ${showWarning ? "bg-red-50" : isGracePeriod ? "bg-gray-50" : "bg-green-50"}`}
				>
					{getStatusIcon()}
				</div>

				<div className="flex-1">
					<div className="font-serif font-bold text-lg text-ink leading-tight">
						{getObjectiveLabel(team.seasonGoal)}
					</div>
					<div className="text-xs text-ink-light mt-0.5">
						Position actuelle :{" "}
						<span
							className={`font-bold ${showWarning ? "text-red-700" : "text-green-700"}`}
						>
							{position}e
						</span>
					</div>
				</div>

				<div className="text-right border-l border-gray-100 pl-4">
					<div className="text-[10px] text-ink-light uppercase font-bold">
						Confiance
					</div>
					<div
						className={`text-xl font-serif font-bold ${getConfidenceColor(team.confidence)}`}
					>
						{team.confidence}%
					</div>
				</div>
			</div>

			{getStatusMessage()}
		</div>
	);
}
