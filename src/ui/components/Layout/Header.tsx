import { MatchService } from "@/competition/match/match-service";
import { useGameStore } from "@/infrastructure/store/gameSlice";
import { useLiveMatchStore } from "@/infrastructure/store/liveMatchStore";
import {
	ChevronRight,
	Loader2,
	User,
	Tv,
} from "lucide-preact";
import { useEffect, useState } from "preact/hooks";
import { useTranslation } from "react-i18next";

interface HeaderProps {
	currentDate: Date;
	isProcessing: boolean;
	showOverlay: boolean;
	onToggleMenu: () => void;
	onContinue: () => void;
	onGoToDashboard?: () => void;
}

export function Header({
	isProcessing,
	showOverlay,
	onToggleMenu,
	onContinue,
	onGoToDashboard,
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

	const weekInSeason = Math.floor((day - 1) / 7) + 1;
	const dayInWeek = ((day - 1) % 7) + 1;

	return (
		<header className="bg-paper-dark p-4 border-b border-gray-300 flex justify-between items-center sticky top-0 z-30">
			<div className="flex items-center">
				<button 
					onClick={onGoToDashboard}
					className="flex flex-col items-start hover:opacity-70 transition-opacity active:scale-95"
				>
					<span className="text-3xl font-black italic tracking-tighter text-ink leading-[0.75] uppercase">
						1863
					</span>
					<span className="text-[11px] font-black italic tracking-tighter text-ink uppercase leading-none">
						Football
					</span>
				</button>
			</div>

			<div className="flex flex-col items-center">
				<div className="text-[10px] font-black uppercase tracking-widest text-ink-light mb-1">
					SAISON {season} • SEMAINE {weekInSeason}
				</div>
				<div className="flex gap-1">
					{[1, 2, 3, 4, 5, 6, 7].map((d) => (
						<div
							key={d}
							className={`w-3 h-3 rounded-sm border transition-all ${
								d === dayInWeek
									? "bg-emerald-500 border-emerald-600 shadow-sm scale-110"
									: d < dayInWeek
										? "bg-gray-200 border-gray-300"
										: "bg-white border-gray-200"
							}`}
						/>
					))}
				</div>
			</div>

			<div className="flex items-center gap-1">
				<button
					onClick={onToggleMenu}
					className="p-2 hover:bg-white/50 rounded-full transition-colors text-black"
				>
					<User size={22} />
				</button>
				
				<button
					onClick={onContinue}
					disabled={isProcessing || showOverlay}
					className={`
						font-bold py-1.5 px-3 rounded-full shadow-lg shadow-accent/10 flex items-center gap-1 
						hover:scale-105 active:scale-95 transition-transform disabled:opacity-70 disabled:scale-100
						${showBall ? "bg-red-600 text-white" : "bg-accent text-white border-2 border-transparent"}
					`}
					title={showBall ? "Match aujourd'hui" : "Jour suivant"}
				>
					{isProcessing || showOverlay ? (
						<Loader2 size={16} className="animate-spin" />
					) : showBall ? (
						<Tv size={18} strokeWidth={3} />
					) : (
						<ChevronRight size={18} strokeWidth={3} />
					)}
				</button>
			</div>
		</header>
	);
}
