import { h } from 'preact';
import { Team } from '@/db/db';
import { Signal } from '@preact/signals';
import { useEffect, useState, useRef } from 'preact/hooks';

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
  isFinished = false
}: ScoreboardProps) {
  const [flashHome, setFlashHome] = useState(false);
  const [flashAway, setFlashAway] = useState(false);

  // Access values to force subscription and usage in logic
  const hVal = typeof homeScore === 'number' ? homeScore : homeScore.value;
  const aVal = typeof awayScore === 'number' ? awayScore : awayScore.value;
  const minVal = typeof minute === 'number' ? minute : minute.value;

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
    <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-20 pb-4 pt-2 px-4 rounded-b-3xl">
      {/* Header Match */}
      <div className="flex justify-center items-center mb-4 opacity-50">
        <span className="text-[10px] font-bold tracking-widest uppercase bg-gray-100 px-2 py-0.5 rounded text-gray-500">
          {isFinished ? 'Terminé' : 'Direct'}
        </span>
      </div>

      <div className="flex justify-between items-start max-w-lg mx-auto">
        
        {/* HOME TEAM */}
        <div className="flex-1 text-center flex flex-col items-center">
          <h2 className="text-lg font-bold text-gray-900 leading-tight">
            {homeTeam.name}
          </h2>
          {/* Liste des buteurs Home */}
          <div className="mt-2 text-xs text-gray-500 space-y-0.5">
            {homeScorers.value.map((s, i) => (
              <div key={i} className="animate-fade-in flex items-center justify-center gap-1">
                 <span>{s.name} {s.minute}'</span>
                 <div className="w-1.5 h-1.5 bg-gray-300 rounded-full"></div>
              </div>
            ))}
          </div>
        </div>

        {/* SCORE CENTRAL */}
        <div className="mx-2 flex flex-col items-center shrink-0 w-24">
          <div className="relative flex items-center justify-center gap-1">
            <span 
                className={`text-4xl font-black tracking-tighter tabular-nums px-2 rounded transition-all duration-300 ${flashHome ? 'bg-red-500 text-white scale-110 shadow-lg' : 'text-gray-800'}`}
            >
              {homeScore}
            </span>
            <span className="text-4xl font-light text-gray-300 mx-0.5">:</span>
            <span 
                className={`text-4xl font-black tracking-tighter tabular-nums px-2 rounded transition-all duration-300 ${flashAway ? 'bg-red-500 text-white scale-110 shadow-lg' : 'text-gray-800'}`}
            >
              {awayScore}
            </span>
          </div>
          
          {/* MINUTE / STATUS INDICATOR */}
          <div className={`mt-1 px-3 py-0.5 rounded-full text-xs font-bold tabular-nums shadow-sm text-center w-fit mx-auto transition-colors duration-500 ${isFinished ? 'bg-black text-white' : 'bg-red-500 text-white animate-pulse'}`}>
            {isFinished ? "FT" : `${minVal}'`}
          </div>
        </div>

        {/* AWAY TEAM */}
        <div className="flex-1 text-center flex flex-col items-center">
          <h2 className="text-lg font-bold text-gray-900 leading-tight">
            {awayTeam.name}
          </h2>
          {/* Liste des buteurs Away */}
          <div className="mt-2 text-xs text-gray-500 space-y-0.5">
            {awayScorers.value.map((s, i) => (
              <div key={i} className="animate-fade-in flex items-center justify-center gap-1">
                 <div className="w-1.5 h-1.5 bg-gray-300 rounded-full"></div>
                 <span>{s.name} {s.minute}'</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* STATS BAR */}
      <div className="max-w-xs mx-auto mt-6 space-y-2">
        {/* Possession */}
        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wide justify-center">
          <span>Possession</span>
        </div>
        <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-gray-100">
          <div style={{ width: `${possession}%` }} className="bg-gray-800 h-full transition-all duration-1000"></div>
          <div style={{ width: `${100 - possession}%` }} className="bg-gray-300 h-full transition-all duration-1000"></div>
        </div>
        <div className="flex justify-between text-[10px] font-bold text-gray-600">
          <span>{possession}%</span>
          <span>{100 - possession}%</span>
        </div>

        {/* Occasions (Tirs) */}
        <div className="flex justify-between items-center pt-2 border-t border-gray-100 mt-2">
           <div className="flex flex-col items-center w-10">
             <span className="text-lg font-black text-gray-800 leading-none">{homeChances}</span>
             <span className="text-[9px] uppercase text-gray-400">Occas.</span>
           </div>
           <span className="text-xs text-gray-300">vs</span>
           <div className="flex flex-col items-center w-10">
             <span className="text-lg font-black text-gray-800 leading-none">{awayChances}</span>
             <span className="text-[9px] uppercase text-gray-400">Occas.</span>
           </div>
        </div>
      </div>
    </div>
  );
}
