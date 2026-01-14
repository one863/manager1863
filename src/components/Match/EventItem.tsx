import { h } from 'preact';
import { MatchEvent } from '@/engine/types';

interface EventItemProps {
  event: MatchEvent;
  homeTeamId: number;
}

export default function EventItem({ event, homeTeamId }: EventItemProps) {
  const isGoal = event.type === 'GOAL';
  const isAmbient = event.type === 'SE' || event.teamId === 0;
  
  if (isAmbient) {
    return (
      <div className="flex justify-center py-1 animate-fade-in opacity-40">
        <span className="text-[10px] italic text-gray-400 font-serif">
          {event.minute}' — {event.description}
        </span>
      </div>
    );
  }

  const isHome = event.teamId === homeTeamId;

  return (
    <div className={`flex gap-4 animate-fade-in py-2 border-b border-gray-100 last:border-0 ${isHome ? 'flex-row' : 'flex-row-reverse text-right'}`}>
      <div className="font-mono text-xs text-gray-300 w-6 shrink-0 pt-0.5">
        {event.minute}'
      </div>

      <div className={`flex-1 max-w-[85%] ${isGoal ? 'text-black font-bold' : 'text-gray-600'}`}>
        <div className="text-xs leading-relaxed font-serif">
          {isGoal && <span className="mr-1">⚽</span>}
          {event.description}
        </div>
      </div>
    </div>
  );
}
