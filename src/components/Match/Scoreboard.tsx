import { h } from 'preact';
import { Team } from '@/db/db';

interface ScoreboardProps {
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number;
  awayScore: number;
  minute: number;
}

export default function Scoreboard({ homeTeam, awayTeam, homeScore, awayScore, minute }: ScoreboardProps) {
  return (
    <div className="bg-paper-dark p-6 border-b-4 border-accent shadow-lg sticky top-0 z-10">
      <div className="flex justify-between items-center max-w-md mx-auto">
        <div className="flex-1 text-center">
          <h2 className="text-xl font-serif font-bold text-ink truncate">{homeTeam.name}</h2>
        </div>
        
        <div className="mx-4 flex flex-col items-center">
           <div className="bg-white px-6 py-3 rounded border-2 border-gray-300 shadow-inner mb-2">
             <span className="text-4xl font-mono font-bold text-ink tracking-widest">
               {homeScore} - {awayScore}
             </span>
           </div>
           <div className="bg-accent text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse">
             {minute}'
           </div>
        </div>
        
        <div className="flex-1 text-center">
          <h2 className="text-xl font-serif font-bold text-ink truncate">{awayTeam.name}</h2>
        </div>
      </div>
    </div>
  );
}
