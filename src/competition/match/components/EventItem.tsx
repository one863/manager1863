import type { MatchEvent } from "@/core/engine/core/types";
import { h } from "preact";

interface EventItemProps {
	event: MatchEvent;
	homeTeamId: number;
}

export default function EventItem({ event, homeTeamId }: EventItemProps) {
	const isGoal = event.type === "GOAL";
	const isAmbient = event.type === "SE" || event.teamId === 0;
	// @ts-ignore
	const isSuspense = event.type === "SUSPENSE";

	// Format minute display (e.g., 90+2 instead of 92)
	const displayMinute = event.minute > 90 
		? `90+${event.minute - 90}` 
		: `${event.minute}`;

	if (isSuspense) {
		return (
			<div className="flex gap-3 animate-fade-in py-3 border-b border-gray-100 last:border-0 items-start group bg-yellow-50/50 -mx-4 px-4">
				<div className="font-mono text-[10px] text-yellow-600 w-10 shrink-0 pt-0.5 text-center font-black bg-yellow-100 rounded h-fit animate-pulse">
					{displayMinute}'
				</div>
				<div className="flex-1 text-left">
					<div className="text-[11px] leading-snug font-serif font-bold text-yellow-800 animate-pulse italic">
						{event.description}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className={`flex gap-3 animate-fade-in py-3 border-b border-gray-100 last:border-0 items-start group ${isGoal ? 'bg-green-50/30 -mx-4 px-4' : ''}`}>
			<div className={`font-mono text-[10px] w-10 shrink-0 pt-0.5 text-center font-black rounded h-fit ${isGoal ? 'bg-black text-white' : 'bg-gray-50 text-ink'}`}>
				{displayMinute}'
			</div>

			<div className={`flex-1 text-left ${isGoal ? "text-black font-extrabold" : "text-gray-600"}`}>
				<div className={`text-[11px] leading-snug font-serif ${isAmbient ? "italic" : ""}`}>
					{isGoal && <span className="mr-1 animate-bounce inline-block">⚽</span>}
					{event.description}
					{event.xg && (
						<span className="ml-2 text-[9px] font-black text-accent opacity-0 group-hover:opacity-100 transition-opacity italic">
							({event.xg.toFixed(2)} xG)
						</span>
					)}
				</div>
			</div>
		</div>
	);
}
