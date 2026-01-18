import type { Team } from "@/core/db/db";
import { Clock } from "lucide-preact";
import { type Signal, useSignalEffect } from "@preact/signals";
import { useSignal } from "@preact/signals";
import { TeamCrest, getTeamColors } from "@/ui/components/Common/TeamCrest";

interface Scorer {
	name: string;
	minute: number;
}

interface ScoreboardProps {
	homeTeam: Team;
	awayTeam: Team;
	homeScore: Signal<number>;
	awayScore: Signal<number>;
	minute: Signal<number>;
	homeScorers: Signal<Scorer[]>;
	awayScorers: Signal<Scorer[]>;
	homeChances: Signal<number>;
	awayChances: Signal<number>;
	homeShots: Signal<number>;
	awayShots: Signal<number>;
	homeXG: Signal<number>;
	awayXG: Signal<number>;
	possession: Signal<number>;
	isFinished: boolean;
	stoppageTime: Signal<number>;
	onFinalize?: () => void;
}

export default function Scoreboard({
	homeTeam,
	awayTeam,
	homeScore,
	awayScore,
	minute,
	homeScorers,
	awayScorers,
	homeChances,
	awayChances,
	homeShots,
	awayShots,
	homeXG,
	awayXG,
	possession,
	isFinished,
	stoppageTime,
	onFinalize
}: ScoreboardProps) {

	const isGoalHighlight = useSignal(false);
	const prevHomeScore = useSignal(homeScore.value);
	const prevAwayScore = useSignal(awayScore.value);

	const homeColors = getTeamColors(homeTeam);
	const awayColors = getTeamColors(awayTeam);

	useSignalEffect(() => {
		if (homeScore.value > prevHomeScore.value || awayScore.value > prevAwayScore.value) {
			isGoalHighlight.value = true;
			setTimeout(() => {
				isGoalHighlight.value = false;
			}, 3000); // Clignote pendant 3 secondes
		}
		prevHomeScore.value = homeScore.value;
		prevAwayScore.value = awayScore.value;
	});

	return (
		<div className="bg-white border-b border-gray-100 shadow-sm relative overflow-hidden shrink-0">
			<div className="relative z-10 p-4 pb-6">
				{/* Top Bar: Time */}
				<div className="flex justify-center mb-6">
					{isFinished ? (
						<button
							onClick={onFinalize}
							className="bg-emerald-600 px-6 py-1.5 rounded-full flex items-center gap-2 border border-emerald-700 shadow-lg active:scale-95 transition-all"
						>
							<span className="font-black text-xs tracking-widest text-white uppercase">
								TERMINÉ
							</span>
						</button>
					) : (
						<div className="bg-gray-50 px-4 py-1.5 rounded-full flex items-center gap-2 border border-gray-100">
							<Clock size={14} className="animate-pulse text-blue-600" />
							<span className="font-bold text-sm tracking-tight text-gray-900">
								{minute.value}'
								{minute.value >= 90 && stoppageTime.value > 0 && (
									<span className="text-red-500 ml-1">+{stoppageTime.value}</span>
								)}
							</span>
						</div>
					)}
				</div>

				{/* Score Display */}
				<div className="flex items-center justify-between px-2 mb-6">
					{/* Home */}
					<div className="flex flex-col items-center w-28">
						<div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100 mb-2 shadow-sm overflow-hidden">
							<TeamCrest 
								primary={homeColors.primary} 
								secondary={homeColors.secondary} 
								name={homeTeam.name}
								type={homeTeam.logoType}
								size="md"
							/>
						</div>
						<span className="text-[11px] font-bold text-center leading-tight text-gray-900 truncate w-full uppercase">
							{homeTeam.name}
						</span>
					</div>

					{/* Score */}
					<div className="flex flex-col items-center">
						<div className={`text-4xl font-black tabular-nums tracking-tight flex items-center gap-4 text-gray-900 transition-colors duration-200 ${isGoalHighlight.value ? 'text-green-600 animate-pulse scale-110' : ''}`}>
							<span>{homeScore.value}</span>
							<span className="text-gray-200 text-2xl">-</span>
							<span>{awayScore.value}</span>
						</div>
					</div>

					{/* Away */}
					<div className="flex flex-col items-center w-28">
						<div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100 mb-2 shadow-sm overflow-hidden">
							<TeamCrest 
								primary={awayColors.primary} 
								secondary={awayColors.secondary} 
								name={awayTeam.name}
								type={awayTeam.logoType}
								size="md"
							/>
						</div>
						<span className="text-[11px] font-bold text-center leading-tight text-gray-900 truncate w-full uppercase">
							{awayTeam.name}
						</span>
					</div>
				</div>

				{/* Scorers List */}
				<div className="grid grid-cols-2 gap-8 text-[11px] mb-6 px-4">
					<div className="text-right flex flex-col gap-1 text-gray-800 font-bold">
						{homeScorers.value.map((s, i) => (
							<div key={i}>{s.name} <span className="text-gray-500 ml-1 font-medium">{s.minute}'</span></div>
						))}
					</div>
					<div className="text-left flex flex-col gap-1 text-gray-800 font-bold">
						{awayScorers.value.map((s, i) => (
							<div key={i}><span className="text-gray-500 mr-1 font-medium">{s.minute}'</span> {s.name}</div>
						))}
					</div>
				</div>

				{/* Match Stats Summary */}
				<div className="bg-gray-50 rounded-xl p-3 space-y-3 border border-gray-100">
					<div className="space-y-1">
						<div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden flex">
							<div 
								className="h-full bg-blue-600 transition-all duration-500" 
								style={{ width: `${possession.value}%` }}
							/>
						</div>
						<div className="flex justify-between text-[10px] font-bold text-gray-500">
							<span>{possession.value}%</span>
							<span className="text-[9px] uppercase tracking-widest opacity-50">Possession</span>
							<span>{100 - possession.value}%</span>
						</div>
					</div>

					<div className="grid grid-cols-3 gap-2">
						<div className="text-center">
							<div className="text-xs font-bold text-gray-900">{homeShots.value}</div>
							<div className="text-[8px] font-bold text-gray-400 uppercase">Tirs</div>
						</div>
						<div className="text-center flex flex-col items-center justify-center">
							<div className="text-xs font-bold text-gray-900 tracking-tighter">
                                {homeXG.value.toFixed(2)} - {awayXG.value.toFixed(2)}
                            </div>
							<div className="text-[9px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded mt-0.5">xG</div>
						</div>
						<div className="text-center">
							<div className="text-xs font-bold text-gray-900">{awayShots.value}</div>
							<div className="text-[8px] font-bold text-gray-400 uppercase">Tirs</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
