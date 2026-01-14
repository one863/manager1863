import type { Match, Team } from "@/engine/types";
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
			className={`p-5 rounded-[2rem] shadow-sm border-2 transition-all bg-white border-paper-dark`}
		>
			<div className="flex justify-between items-center mb-4">
				<h3
					className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${isToday ? "text-accent" : "text-ink-light"}`}
				>
					{isToday ? (
						<AlertCircle size={14} className="animate-pulse" />
					) : (
						<Calendar size={14} />
					)}
					{isToday
						? "Match Aujourd'hui"
						: daysUntil === 1
							? "Match Demain"
							: `Dans ${daysUntil} jours`}
				</h3>
				{nextMatch && (
					<button
						onClick={() => onShowOpponent?.(nextMatch.opponent.id!)}
						className={`flex items-center gap-1.5 text-[10px] font-bold px-3 py-1 rounded-full transition-colors bg-paper-dark text-ink-light hover:text-ink border border-gray-100`}
					>
						<Info size={12} /> VOIR ADVERSAIRE
					</button>
				)}
			</div>

			{nextMatch && userTeamId ? (
				<div className="flex flex-col gap-4">
					<div
						className={`flex justify-between items-center p-5 rounded-2xl bg-paper-dark/30 border border-gray-100`}
					>
						<div className="text-center w-[40%]">
							<div
								className={`font-serif font-bold text-base truncate text-ink`}
							>
								{nextMatch.match.homeTeamId === userTeamId
									? userTeamName
									: nextMatch.opponent.name}
							</div>
							<div
								className={`text-[8px] font-black uppercase tracking-widest text-ink-light/50`}
							>
								Domicile
							</div>
						</div>

						<div className="text-center w-[20%] flex flex-col items-center">
							<span
								className={`font-serif italic text-sm text-accent font-bold`}
							>
								vs
							</span>
						</div>

						<div className="text-center w-[40%]">
							<div
								className={`font-serif font-bold text-base truncate text-ink`}
							>
								{nextMatch.match.awayTeamId === userTeamId
									? userTeamName
									: nextMatch.opponent.name}
							</div>
							<div
								className={`text-[8px] font-black uppercase tracking-widest text-ink-light/50`}
							>
								Extérieur
							</div>
						</div>
					</div>
				</div>
			) : (
				<div
					className={`text-center py-6 text-xs italic text-ink-light`}
				>
					Aucun match prévu.
				</div>
			)}
		</div>
	);
}
