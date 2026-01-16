import type { MatchEvent } from "@/engine/core/types";
import { h } from "preact";

interface EventItemProps {
	event: MatchEvent;
	homeTeamId: number;
}

export default function EventItem({ event, homeTeamId }: EventItemProps) {
	const isGoal = event.type === "GOAL";
	const isAmbient = event.type === "SE" || event.teamId === 0;

	return (
		<div className="flex gap-3 animate-fade-in py-3 border-b border-gray-100 last:border-0 items-start group">
			<div className="font-mono text-[10px] text-ink w-8 shrink-0 pt-0.5 text-center font-black bg-gray-50 rounded h-fit">
				{event.minute}'
			</div>

			<div className={`flex-1 text-left ${isGoal ? "text-black font-extrabold" : "text-gray-600"}`}>
				<div className={`text-[11px] leading-snug font-serif ${isAmbient ? "italic" : ""}`}>
					{isGoal && <span className="mr-1">⚽</span>}
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
