import { h } from 'preact';
import { MatchEvent } from '@/engine/types';

interface EventItemProps {
  event: MatchEvent;
  homeTeamId: number;
}

export default function EventItem({ event, homeTeamId }: EventItemProps) {
  const isGoal = event.type === 'GOAL';
  const isMiss = event.type === 'MISS';
  const isAmbient = event.type === 'SE' || event.teamId === 0;
  
  // Si c'est un événement d'ambiance, on centre le texte
  if (isAmbient) {
    return (
      <div className="flex justify-center p-2 animate-fade-in">
        <div className="bg-paper-dark/50 px-4 py-2 rounded-full border border-gray-200 text-[10px] italic text-ink-light font-serif shadow-inner">
          {event.minute}' - {event.description}
        </div>
      </div>
    );
  }

  const isHome = event.teamId === homeTeamId;

  return (
    <div className={`flex gap-3 animate-fade-in ${isHome ? 'flex-row' : 'flex-row-reverse text-right'}`}>
      <div className={`font-mono font-bold w-10 h-10 shrink-0 text-center flex items-center justify-center rounded-full border-2 shadow-sm ${isGoal ? 'bg-accent text-white border-accent scale-110' : 'bg-white text-ink-light border-gray-200'}`}>
        {event.minute}'
      </div>

      <div className={`p-3 rounded-xl shadow-sm border max-w-[80%] ${isGoal ? 'bg-yellow-50 border-yellow-300 text-ink' : 'bg-white border-gray-200 text-ink-light'}`}>
        <div className={`font-bold text-[10px] uppercase mb-1 flex items-center gap-2 ${isHome ? 'justify-start' : 'justify-end'}`}>
          {isGoal && <span className="text-accent">⚽ BUT !</span>}
          {isMiss && <span>❌ OCCASION</span>}
        </div>
        <div className="text-xs leading-relaxed font-serif italic">
          "{event.description}"
        </div>
      </div>
    </div>
  );
}
