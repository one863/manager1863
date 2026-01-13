import { h } from 'preact';
import { useTranslation } from 'react-i18next';
import { Match, Team } from '@/db/db';
import { Calendar } from 'lucide-preact';

interface NextMatchCardProps {
  nextMatch: { match: Match, opponent: Team } | null;
  userTeamId: number | null;
  userTeamName: string;
}

export default function NextMatchCard({ nextMatch, userTeamId, userTeamName }: NextMatchCardProps) {
  const { t } = useTranslation();

  const getDisplayTeamName = (teamName: string, isUser: boolean) => {
    if (isUser) return teamName.length > 10 ? teamName.substring(0, 10) + '.' : teamName;
    return teamName.substring(0, 3).toUpperCase();
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-sm font-bold text-ink-light uppercase tracking-wider mb-3 flex items-center gap-2">
        <Calendar size={14} />
        {t('dashboard.next_match')}
      </h3>
      
      {nextMatch && userTeamId ? (
        <>
          <div className="flex justify-between items-center bg-paper-dark p-3 rounded mb-3">
            <div className="text-center w-1/3 overflow-hidden">
              <div className={`font-bold text-lg truncate ${nextMatch.match.homeTeamId === userTeamId ? 'text-ink' : 'text-ink-light'}`}>
                {nextMatch.match.homeTeamId === userTeamId 
                  ? getDisplayTeamName(userTeamName, true) 
                  : getDisplayTeamName(nextMatch.opponent.name, false)}
              </div>
              <div className="text-[10px] text-ink-light uppercase">
                {nextMatch.match.homeTeamId === userTeamId ? t('dashboard.home') : t('dashboard.away')}
              </div>
            </div>

            <div className="text-center w-1/3 flex flex-col items-center">
               <span className="font-serif italic text-ink-light text-sm">vs</span>
               <span className="text-[10px] font-mono mt-1 text-accent">
                 {t('game.date_format', { date: nextMatch.match.date })}
               </span>
            </div>

            <div className="text-center w-1/3 overflow-hidden">
              <div className={`font-bold text-lg truncate ${nextMatch.match.awayTeamId === userTeamId ? 'text-ink' : 'text-ink-light'}`}>
                {nextMatch.match.awayTeamId === userTeamId 
                  ? getDisplayTeamName(userTeamName, true) 
                  : getDisplayTeamName(nextMatch.opponent.name, false)}
              </div>
              <div className="text-[10px] text-ink-light uppercase">
                {nextMatch.match.awayTeamId === userTeamId ? t('dashboard.home') : t('dashboard.away')}
              </div>
            </div>
          </div>
          
          <div className="text-center text-xs text-ink-light italic">
            {nextMatch.match.homeTeamId === userTeamId 
              ? `Vous recevez ${nextMatch.opponent.name}` 
              : `Déplacement à ${nextMatch.opponent.name}`}
          </div>
        </>
      ) : (
        <div className="text-center p-4 bg-gray-50 rounded italic text-ink-light">
          Aucun match prévu prochainement.
        </div>
      )}
    </div>
  );
}
