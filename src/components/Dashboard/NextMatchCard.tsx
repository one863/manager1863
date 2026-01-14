import type { Match, Team } from "@/db/db";
import { AlertCircle, Calendar, Info } from "lucide-preact";
import { h } from "preact";
import { useTranslation } from "react-i18next";
import { useGameStore } from "@/store/gameSlice";

interface NextMatchCardProps {
	nextMatch: { match: Match; opponent: Team } | null;
	userTeamId: number | null;
	userTeamName: string;
	currentDate: Date;
	onShowOpponent?: (id: number) => void;
}

export default function NextMatchCard({
	nextMatch,
	userTeamId,
	userTeamName,
	currentDate,
	onShowOpponent,
}: NextMatchCardProps) {
	const { t } = useTranslation();
	const day = useGameStore((state) => state.day);

	const isToday = nextMatch && nextMatch.match.day === day;
	const daysUntil = nextMatch ? nextMatch.match.day - day : 0;

	return (
		<div
			className={`p-5 rounded-2xl shadow-md border-2 transition-all ${isToday ? "bg-accent border-accent text-white" : "bg-white border-gray-200"}`}
		>
			<div className="flex justify-between items-center mb-4">
				<h3
					className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${isToday ? "text-white" : "text-ink-light"}`}
				>
					{isToday ? (
						<AlertCircle size={14} className="animate-bounce" />
					) : (
						<Calendar size={14} />
					)}
					{isToday
						? "MATCH AUJOURD'HUI"
						: daysUntil === 1
							? "MATCH DEMAIN"
							: `PROCHAIN MATCH DANS ${daysUntil} JOURS`}
				</h3>
				{nextMatch && (
					<button
						onClick={() => onShowOpponent?.(nextMatch.opponent.id!)}
						className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-full transition-colors ${isToday ? "text-white bg-white/20 hover:bg-white/30" : "text-accent bg-accent/5 hover:bg-accent/10"}`}
					>
						<Info size={12} /> VOIR ADVERSAIRE
					</button>
				)}
			</div>

			{nextMatch && userTeamId ? (
				<div className="flex flex-col gap-4">
					<div
						className={`flex justify-between items-center p-4 rounded-xl border ${isToday ? "bg-white/10 border-white/20" : "bg-paper-dark/50 border-gray-100"}`}
					>
						<div className="text-center w-[40%]">
							<div
								className={`font-serif font-bold text-lg truncate ${isToday ? "text-white" : nextMatch.match.homeTeamId === userTeamId ? "text-ink" : "text-ink-light"}`}
							>
								{nextMatch.match.homeTeamId === userTeamId
									? userTeamName
									: nextMatch.opponent.name}
							</div>
							<div
								className={`text-[9px] uppercase tracking-tighter ${isToday ? "text-white/70" : "text-ink-light"}`}
							>
								Domicile
							</div>
						</div>

						<div className="text-center w-[20%] flex flex-col items-center">
							<span
								className={`font-serif italic text-xs opacity-50 ${isToday ? "text-white" : "text-ink-light"}`}
							>
								vs
							</span>
						</div>

						<div className="text-center w-[40%]">
							<div
								className={`font-serif font-bold text-lg truncate ${isToday ? "text-white" : nextMatch.match.awayTeamId === userTeamId ? "text-ink" : "text-ink-light"}`}
							>
								{nextMatch.match.awayTeamId === userTeamId
									? userTeamName
									: nextMatch.opponent.name}
							</div>
							<div
								className={`text-[9px] uppercase tracking-tighter ${isToday ? "text-white/70" : "text-ink-light"}`}
							>
								Extérieur
							</div>
						</div>
					</div>
				</div>
			) : (
				<div
					className={`text-center py-6 text-xs italic ${isToday ? "text-white" : "text-ink-light"}`}
				>
					Aucun match prévu.
				</div>
			)}
		</div>
	);
}
