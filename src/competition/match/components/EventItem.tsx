import type { MatchEvent } from "@/core/engine/core/types";
import { MoveRight, ShieldCheck, Zap, AlertTriangle } from "lucide-preact";

interface EventItemProps {
	event: MatchEvent;
	homeTeamId: number;
}

export default function EventItem({ event, homeTeamId }: EventItemProps) {
	const isGoal = event.type === "GOAL";
    // @ts-ignore
	const isSuspense = event.type === "SUSPENSE";
	const displayMinute = event.minute > 90 ? `90+${event.minute - 90}` : `${event.minute}`;

    const GreenBall = () => (
        <div className="w-3 h-3 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm border border-emerald-600 inline-flex mr-2 shrink-0">
            <div className="w-1 h-1 bg-white rounded-full opacity-60" />
        </div>
    );

    const getIcon = () => {
        if (isGoal) return <GreenBall />;
        switch (event.type) {
            case "CARD": return <span className="mr-2">🟨</span>;
            case "INJURY": return <span className="mr-2">🚑</span>;
            case "SUBSTITUTION": return <span className="mr-2">🔄</span>;
            case "SPECIAL": return <Zap size={14} className="mr-2 text-emerald-500" />;
            case "MISS": return <span className="mr-2 text-red-500">✕</span>;
            case "TRANSITION": 
                if (event.description.includes("Dégagement")) return <ShieldCheck size={14} className="mr-2 text-blue-400" />;
                if (event.description.includes("pénètre")) return <Zap size={14} className="mr-2 text-orange-400 animate-pulse" />;
                if (event.description.includes("Interception")) return <ShieldCheck size={14} className="mr-2 text-gray-400" />;
                return <MoveRight size={14} className="mr-2 text-gray-300" />;
            default: return null;
        }
    };

	if (isSuspense) {
		return (
			<div className="flex gap-3 animate-fade-in py-3 border-b border-gray-100 items-start bg-yellow-50/50 -mx-4 px-6">
				<div className="font-black text-[10px] text-yellow-700 bg-yellow-200 px-1.5 py-0.5 rounded animate-pulse">{displayMinute}'</div>
				<div className="text-[13px] font-bold text-yellow-900 animate-pulse">{event.description}</div>
			</div>
		);
	}

	return (
		<div className={`flex gap-3 animate-fade-in py-2 border-b border-gray-50 items-start ${isGoal ? 'bg-emerald-50/30 -mx-4 px-6 relative z-10' : 'hover:bg-gray-50/50 transition-colors px-2 rounded-lg'}`}>
			<div className={`font-mono text-[10px] w-8 shrink-0 py-0.5 text-center font-black rounded border ${isGoal ? 'bg-black text-white border-black' : 'bg-white text-gray-400 border-gray-100'}`}>
				{displayMinute}
			</div>

			<div className="flex-1 text-left">
				<div className={`text-[12px] leading-tight flex items-center flex-wrap ${isGoal ? "text-gray-900 font-black" : "text-gray-600 font-medium"}`}>
					{getIcon()}
					<span>{event.description}</span>
					{event.xg && (
						<span className="ml-2 text-[9px] font-bold text-blue-500 opacity-60 italic">({event.xg.toFixed(2)} xG)</span>
					)}
				</div>
			</div>
		</div>
	);
}
