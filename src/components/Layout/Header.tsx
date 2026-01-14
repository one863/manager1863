import { MatchService } from "@/services/match-service";
import { useGameStore } from "@/store/gameSlice";
import { useLiveMatchStore } from "@/store/liveMatchStore";
import {
	ChevronRight,
	Loader2,
	Menu,
	X,
	Castle,
} from "lucide-preact";
import { useEffect, useState } from "preact/hooks";
import { useTranslation } from "react-i18next";

interface HeaderProps {
	currentDate: Date;
	isProcessing: boolean;
	showOverlay: boolean;
	isMenuOpen: boolean;
	onToggleMenu: () => void;
	onContinue: () => void;
}

export function Header({
	isProcessing,
	showOverlay,
	isMenuOpen,
	onToggleMenu,
	onContinue,
}: HeaderProps) {
	const { t } = useTranslation();
	const season = useGameStore((state) => state.season);
	const day = useGameStore((state) => state.day);
	const currentSaveId = useGameStore((state) => state.currentSaveId);
	const userTeamId = useGameStore((state) => state.userTeamId);

	const liveMatch = useLiveMatchStore((state) => state.liveMatch);
	const isLiveFinished = liveMatch && liveMatch.currentMinute >= 90;

	const [hasMatchToday, setHasMatchToday] = useState(false);

	useEffect(() => {
		const checkMatch = async () => {
			if (currentSaveId && userTeamId) {
				const hasMatch = await MatchService.hasUserMatchToday(
					currentSaveId,
					day,
					userTeamId,
				);
				setHasMatchToday(hasMatch);
			}
		};
		checkMatch();
	}, [day, currentSaveId, userTeamId]);

	const showBall = hasMatchToday && !isLiveFinished;

	// Calculer la semaine et le jour de la semaine
	// Une saison = 18 semaines de 7 jours = 126 jours
	const weekInSeason = Math.floor((day - 1) / 7) + 1;
	const dayInWeek = ((day - 1) % 7) + 1;

	return (
		<header className="bg-paper-dark p-4 border-b border-gray-300 flex justify-between items-center sticky top-0 z-30">
			<div className="flex items-center gap-3">
				<button
					onClick={onToggleMenu}
					className="p-2 hover:bg-white/50 rounded-full transition-colors text-black"
				>
					{isMenuOpen ? <X size={24} /> : <Menu size={24} />}
				</button>
				<h1 className="text-xl font-serif font-bold text-black tracking-tight">
					FOOTBALL
				</h1>
			</div>

			<div className="flex flex-col items-center">
				<div className="text-[10px] font-bold uppercase tracking-widest text-ink-light mb-1">
					Saison {season} • Semaine {weekInSeason}
				</div>
				<div className="flex gap-1">
					{[1, 2, 3, 4, 5, 6, 7].map((d) => (
						<div
							key={d}
							className={`w-3 h-3 rounded-sm border ${
								d === dayInWeek
									? "bg-green-500 border-green-600 shadow-sm"
									: d < dayInWeek
										? "bg-gray-300 border-gray-400"
										: "bg-white border-gray-200"
							}`}
						/>
					))}
				</div>
			</div>

			<div className="flex items-center gap-2">
				<button
					onClick={onContinue}
					disabled={isProcessing || showOverlay}
					className={`
            font-bold py-1.5 px-3 rounded-full shadow-sm flex items-center gap-1 
            hover:scale-105 active:scale-95 transition-transform disabled:opacity-70 disabled:scale-100
            ${showBall ? "bg-red-600 text-white" : "bg-black text-white border-2 border-transparent"}
          `}
					title={showBall ? "Match aujourd'hui" : "Jour suivant"}
				>
					{isProcessing || showOverlay ? (
						<Loader2 size={16} className="animate-spin" />
					) : showBall ? (
						<Castle size={18} strokeWidth={3} />
					) : (
						<ChevronRight size={18} strokeWidth={3} />
					)}
				</button>
			</div>
		</header>
	);
}
