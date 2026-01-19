import type { MatchEvent } from "@/core/engine/core/types";
import { h } from "preact";

interface EventItemProps {
	event: MatchEvent;
	homeTeamId: number;
}

export default function EventItem({ event, homeTeamId }: EventItemProps) {
	const isGoal = event.type === "GOAL";
	// @ts-ignore
	const isSuspense = event.type === "SUSPENSE";

	// Format minute display (e.g., 90+2 instead of 92)
	const displayMinute = event.minute > 90 
		? `90+${event.minute - 90}` 
		: `${event.minute}`;

    const getIcon = () => {
        switch (event.type) {
            case "GOAL": return "⚽";
            case "CORNER": return "⛳";
            case "FREE_KICK": return "🎯";
            case "SPECIAL": return "🥅"; // Penalty
            case "CARD": return "🟨"; // Par défaut jaune, le texte précisera
            case "INJURY": return "🚑";
            case "COUNTER_PRESS": return "⚡";
            case "LONG_THROW": return "🚀";
            case "SUBSTITUTION": return "🔄";
            case "COUNTER_ATTACK": return "💨";
            default: return null;
        }
    };

    const icon = getIcon();

	if (isSuspense) {
		return (
			<div className="flex gap-4 animate-fade-in py-4 border-b border-gray-100 last:border-0 items-start group bg-yellow-50 -mx-4 px-6">
				<div className="font-mono text-xs text-yellow-700 w-12 shrink-0 pt-1 text-center font-black bg-yellow-200 rounded h-fit animate-pulse border border-yellow-300">
					{displayMinute}'
				</div>
				<div className="flex-1 text-left">
					<div className="text-[13px] leading-relaxed font-bold text-yellow-900 animate-pulse">
						{event.description}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className={`flex gap-4 animate-fade-in py-4 border-b border-gray-100 last:border-0 items-start group ${isGoal ? 'bg-emerald-50/50 -mx-4 px-6 shadow-sm relative z-10' : 'bg-white/40 hover:bg-white transition-colors px-2 rounded-xl my-1'}`}>
			<div className={`font-mono text-xs w-12 shrink-0 pt-1 text-center font-black rounded h-fit border ${isGoal ? 'bg-black text-white border-black shadow-md' : 'bg-paper text-ink border-ink/5'}`}>
				{displayMinute}'
			</div>

			<div className={`flex-1 text-left ${isGoal ? "text-ink font-black" : "text-ink"}`}>
				<div className={`text-[13px] leading-relaxed ${!icon && !isGoal ? "text-ink-light" : "font-medium"}`}>
					{icon && <span className="mr-2 inline-block">{icon}</span>}
					{event.description}
					{event.xg && (
						<span className="ml-2 text-[10px] font-black text-accent opacity-0 group-hover:opacity-100 transition-opacity italic">
							({event.xg.toFixed(2)} xG)
						</span>
					)}
				</div>
			</div>
		</div>
	);
}
