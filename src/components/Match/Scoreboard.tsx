import type { Team } from "@/db/db";
import type { Signal } from "@preact/signals";
import { useEffect, useRef, useState } from "preact/hooks";

interface Scorer {
	name: string;
	minute: number;
}

interface ScoreboardProps {
	homeTeam: Team;
	awayTeam: Team;
	homeScore: number | Signal<number>;
	awayScore: number | Signal<number>;
	minute: number | Signal<number>;
	homeScorers: Signal<Scorer[]>;
	awayScorers: Signal<Scorer[]>;
	homeChances: Signal<number>;
	awayChances: Signal<number>;
	possession: number;
	isFinished?: boolean;
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
	possession,
	isFinished = false,
}: ScoreboardProps) {
	const [flashHome, setFlashHome] = useState(false);
	const [flashAway, setFlashAway] = useState(false);

	const hVal = typeof homeScore === "number" ? homeScore : homeScore.value;
	const aVal = typeof awayScore === "number" ? awayScore : awayScore.value;
	const minVal = typeof minute === "number" ? minute : minute.value;

	const prevHome = useRef(hVal);
	const prevAway = useRef(aVal);

	useEffect(() => {
		if (hVal > prevHome.current) {
			setFlashHome(true);
			setTimeout(() => setFlashHome(false), 3000);
		}
		prevHome.current = hVal;
	}, [hVal]);

	useEffect(() => {
		if (aVal > prevAway.current) {
			setFlashAway(true);
			setTimeout(() => setFlashAway(false), 3000);
		}
		prevAway.current = aVal;
	}, [aVal]);

	return (
		<div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-20 pb-6 pt-12 px-4 rounded-b-[2.5rem]">
			{/* Header Match Status */}
			<div className="flex justify-center items-center mb-6 opacity-40">
				<span className="text-[9px] font-black tracking-[0.25em] uppercase bg-gray-100 px-3 py-1 rounded-full text-gray-600">
					{isFinished ? "Match Terminé" : "Simulation en Direct"}
				</span>
			</div>

			<div className="flex justify-between items-start w-full">
				{/* HOME TEAM */}
				<div className="flex-1 flex-basis-0 text-center flex flex-col items-center min-w-0">
					<h2 className="text-[13px] font-black text-gray-900 leading-tight uppercase tracking-tight truncate w-full px-1">
						{homeTeam.name}
					</h2>
					<div className="mt-2 text-xs font-bold text-gray-500 space-y-1">
						{homeScorers.value.map((s, i) => (
							<div
								key={i}
								className="animate-fade-in flex items-center justify-center gap-1"
							>
								<span>{s.name} {s.minute}'</span>
							</div>
						))}
					</div>
				</div>

				{/* SCORE CENTRAL */}
				<div className="flex flex-col items-center shrink-0 w-28 px-2">
					<div className="relative flex items-center justify-center gap-1">
						<span
							className={`text-4xl font-black tracking-tighter tabular-nums px-2 rounded transition-all duration-300 ${flashHome ? "bg-red-500 text-white scale-110 shadow-lg" : "text-gray-800"}`}
						>
							{hVal}
						</span>
						<span className="text-3xl font-light text-gray-200 mx-0.5">:</span>
						<span
							className={`text-4xl font-black tracking-tighter tabular-nums px-2 rounded transition-all duration-300 ${flashAway ? "bg-red-500 text-white scale-110 shadow-lg" : "text-gray-800"}`}
						>
							{aVal}
						</span>
					</div>

					<div
						className={`mt-2 px-4 py-1 rounded-full text-[10px] font-black tabular-nums shadow-sm text-center w-fit mx-auto transition-colors duration-500 ${isFinished ? "bg-black text-white" : "bg-red-500 text-white animate-pulse"}`}
					>
						{isFinished ? "FT" : `${minVal}'`}
					</div>
				</div>

				{/* AWAY TEAM */}
				<div className="flex-1 flex-basis-0 text-center flex flex-col items-center min-w-0">
					<h2 className="text-[13px] font-black text-gray-900 leading-tight uppercase tracking-tight truncate w-full px-1">
						{awayTeam.name}
					</h2>
					<div className="mt-2 text-xs font-bold text-gray-500 space-y-1">
						{awayScorers.value.map((s, i) => (
							<div
								key={i}
								className="animate-fade-in flex items-center justify-center gap-1"
							>
								<span>{s.name} {s.minute}'</span>
							</div>
						))}
					</div>
				</div>
			</div>

			{/* STATS BAR */}
			<div className="max-w-xs mx-auto mt-8 space-y-2">
				<div className="flex h-1.5 w-full rounded-full overflow-hidden bg-gray-100">
					<div
						style={{ width: `${possession}%` }}
						className="bg-gray-800 h-full transition-all duration-1000"
					/>
					<div
						style={{ width: `${100 - possession}%` }}
						className="bg-gray-300 h-full transition-all duration-1000"
					/>
				</div>
				<div className="flex justify-between text-[9px] font-black text-gray-500 uppercase tracking-widest">
					<span>{possession}% Possession</span>
					<span>{100 - possession}%</span>
				</div>

				<div className="flex justify-between items-center pt-3 border-t border-gray-100 mt-2">
					<div className="flex flex-col items-center w-12">
						<span className="text-xl font-black text-gray-800 leading-none">
							{homeChances.value}
						</span>
						<span className="text-[8px] font-black uppercase text-gray-400 mt-1">Occas.</span>
					</div>
					<span className="text-[9px] font-black text-gray-200 uppercase tracking-widest">Versus</span>
					<div className="flex flex-col items-center w-12">
						<span className="text-xl font-black text-gray-800 leading-none">
							{awayChances.value}
						</span>
						<span className="text-[8px] font-black uppercase text-gray-400 mt-1">Occas.</span>
					</div>
				</div>
			</div>
		</div>
	);
}
