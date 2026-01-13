import { h } from 'preact';
import { MatchEvent } from '@/engine/types';

interface EventItemProps {
  event: MatchEvent;
  homeTeamId: number;
}

export default function EventItem({ event, homeTeamId }: EventItemProps) {
  const isGoal = event.type === 'GOAL';
  const isHome = event.teamId === homeTeamId;

  return (
    <div className={`flex gap-3 animate-fade-in ${isHome ? 'flex-row' : 'flex-row-reverse text-right'}`}>
      <div className={`
        font-mono font-bold w-10 h-10 shrink-0 text-center flex items-center justify-center rounded-full border-2 shadow-sm
        ${isGoal ? 'bg-accent text-white border-accent scale-110' : 'bg-white text-ink-light border-gray-200'}
      `}>
        {event.minute}'
      </div>
      
      <div className={`
        p-3 rounded-lg shadow-sm border max-w-[85%]
        ${isGoal 
          ? 'bg-yellow-50 border-yellow-300 text-ink' 
          : 'bg-white border-gray-200 text-ink-light'}
      `}>
        <div className="font-bold mb-1 flex items-center gap-2 justify-start">
          {isGoal && <span>⚽ GOAL!</span>}
          {event.type === 'MISS' && <span>❌ Missed Chance</span>}
        </div>
        <div className="text-sm leading-relaxed font-serif">
          {event.description}
        </div>
      </div>
    </div>
  );
}
