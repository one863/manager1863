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
		<div className="flex gap-3 animate-fade-in py-2 border-b border-gray-100 last:border-0 items-start">
			{/* Minute (Always Left) */}
			<div className="font-mono text-xs text-ink w-6 shrink-0 pt-0.5 text-center font-bold">
				{event.minute}'
			</div>

			{/* Content (Always Left) */}
			<div
				className={`flex-1 text-left ${isGoal ? "text-black font-bold" : "text-gray-600"}`}
			>
				<div className={`text-xs leading-relaxed font-serif ${isAmbient ? "italic" : ""}`}>
					{isGoal && <span className="mr-1">⚽</span>}
					{event.description}
				</div>
			</div>
		</div>
	);
}
