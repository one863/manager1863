import { h } from 'preact';
import { useTranslation } from 'react-i18next';
import { Match, Team } from '@/db/db';
import { Calendar, AlertCircle, Settings2 } from 'lucide-preact';

interface NextMatchCardProps {
  nextMatch: { match: Match; opponent: Team } | null;
  userTeamId: number | null;
  userTeamName: string;
  currentDate: Date;
  onClick?: () => void;
}

export default function NextMatchCard({ nextMatch, userTeamId, userTeamName, currentDate, onClick }: NextMatchCardProps) {
  const { t } = useTranslation();

  const isToday = nextMatch && new Date(nextMatch.match.date).toDateString() === currentDate.toDateString();

  return (
    <div 
      onClick={onClick}
      className={`p-5 rounded-2xl shadow-md border-2 transition-all cursor-pointer group active:scale-[0.98] ${isToday ? 'bg-accent/5 border-accent animate-pulse-slow' : 'bg-white border-gray-200 hover:border-accent'}`}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${isToday ? 'text-accent' : 'text-ink-light'}`}>
          {isToday ? <AlertCircle size={14} className="animate-bounce" /> : <Calendar size={14} />}
          {isToday ? "MATCH AUJOURD'HUI" : t('dashboard.next_match')}
        </h3>
        {isToday && (
          <span className="bg-accent text-white text-[9px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
             <Settings2 size={10} /> PRÉPARER TACTIQUE
          </span>
        )}
      </div>

      {nextMatch && userTeamId ? (
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center bg-paper-dark/50 p-4 rounded-xl border border-gray-100">
            <div className="text-center w-[40%]">
              <div className={`font-serif font-bold text-lg truncate ${nextMatch.match.homeTeamId === userTeamId ? 'text-ink' : 'text-ink-light'}`}>
                {nextMatch.match.homeTeamId === userTeamId ? userTeamName : nextMatch.opponent.name}
              </div>
              <div className="text-[9px] text-ink-light uppercase tracking-tighter">Domicile</div>
            </div>

            <div className="text-center w-[20%] flex flex-col items-center">
              <span className="font-serif italic text-ink-light text-xs opacity-50">vs</span>
            </div>

            <div className="text-center w-[40%]">
              <div className={`font-serif font-bold text-lg truncate ${nextMatch.match.awayTeamId === userTeamId ? 'text-ink' : 'text-ink-light'}`}>
                {nextMatch.match.awayTeamId === userTeamId ? userTeamName : nextMatch.opponent.name}
              </div>
              <div className="text-[9px] text-ink-light uppercase tracking-tighter">Extérieur</div>
            </div>
          </div>

          <div className="text-center">
             <p className={`text-xs font-medium ${isToday ? 'text-accent' : 'text-ink-light'} italic`}>
                {nextMatch.match.homeTeamId === userTeamId ? `Réception de ${nextMatch.opponent.name}` : `Déplacement chez ${nextMatch.opponent.name}`}
             </p>
          </div>
        </div>
      ) : (
        <div className="text-center py-6 text-xs text-ink-light italic">Aucun match prévu.</div>
      )}
    </div>
  );
}
