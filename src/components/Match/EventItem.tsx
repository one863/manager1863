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
      <div className="flex gap-3 animate-fade-in py-1 opacity-40 items-start">
        <div className="font-mono text-xs text-gray-300 w-6 shrink-0 pt-0.5 text-center">
            {event.minute}'
        </div>
        <div className="flex-1 text-left text-[10px] italic text-gray-400 font-serif">
            {event.description}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 animate-fade-in py-2 border-b border-gray-100 last:border-0 items-start">
      {/* Minute (Always Left) */}
      <div className="font-mono text-xs text-gray-300 w-6 shrink-0 pt-0.5 text-center">
        {event.minute}'
      </div>

      {/* Content (Always Left) */}
      <div className={`flex-1 text-left ${isGoal ? 'text-black font-bold' : 'text-gray-600'}`}>
        <div className="text-xs leading-relaxed font-serif">
          {isGoal && <span className="mr-1">⚽</span>}
          {event.description}
        </div>
      </div>
    </div>
  );
}
