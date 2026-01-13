import { useState, useEffect } from 'preact/hooks';
import { db, Match, Team } from '@/db/db';
import { useGameStore } from '@/store/gameSlice';
import { useTranslation } from 'react-i18next';
import MatchReport from '@/components/MatchReport';
import ClubDetails from '@/components/ClubDetails';
import { Calendar as CalendarIcon, Trophy, CheckCircle2 } from 'lucide-preact';

export default function Calendar() {
  const { t } = useTranslation();
  const currentSaveId = useGameStore((state) => state.currentSaveId);
  const userTeamId = useGameStore((state) => state.userTeamId);
  const currentDay = useGameStore((state) => state.day);

  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Record<number, Team>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (currentSaveId === null) {
        setIsLoading(false);
        return;
      }

      try {
        const allTeams = await db.teams.where('saveId').equals(currentSaveId).toArray();
        const teamsMap: Record<number, Team> = {};
        allTeams.forEach((team) => { if (team.id) teamsMap[team.id] = team; });
        setTeams(teamsMap);

        const allMatches = await db.matches.where('saveId').equals(currentSaveId).toArray();
        allMatches.sort((a, b) => a.day - b.day);
        setMatches(allMatches);
      } catch (error) {
        console.error('Erreur chargement calendrier:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [currentSaveId]);

  if (isLoading) return <div className="p-8 text-center animate-pulse">{t('game.loading')}</div>;

  return (
    <div className="pb-20 space-y-6 animate-fade-in">
      <div className="flex justify-between items-center mb-4 px-2 border-b border-gray-200 pb-4">
        <div>
          <h2 className="text-xl font-serif font-bold text-ink flex items-center gap-2">
            <CalendarIcon className="text-accent" />
            Programme de la Saison
          </h2>
          <p className="text-[10px] text-ink-light uppercase tracking-widest font-bold">Chronologie des rencontres</p>
        </div>
      </div>

      <div className="space-y-3">
        {matches.map((match) => {
          const homeTeam = teams[match.homeTeamId];
          const awayTeam = teams[match.awayTeamId];
          const isUserMatch = match.homeTeamId === userTeamId || match.awayTeamId === userTeamId;
          const isPassed = match.day < currentDay;
          const isToday = match.day === currentDay;

          return (
            <div
              key={match.id}
              className={`
                group relative bg-white rounded-xl border-2 transition-all p-3 flex items-center gap-4
                ${isUserMatch ? 'border-accent shadow-sm' : 'border-gray-100 opacity-60'}
                ${isToday ? 'ring-2 ring-accent ring-offset-2 animate-pulse-slow' : ''}
              `}
            >
              {/* Jour du Match */}
              <div className={`
                w-12 h-12 rounded-lg flex flex-col items-center justify-center font-mono
                ${isPassed ? 'bg-gray-100 text-gray-400' : isToday ? 'bg-accent text-white' : 'bg-paper-dark text-ink'}
              `}>
                <span className="text-[10px] uppercase font-bold leading-none mb-1">Jour</span>
                <span className="text-lg font-bold leading-none">{match.day}</span>
              </div>

              {/* Contenu Match */}
              <div className="flex-1 flex items-center justify-between">
                <button 
                  onClick={() => setSelectedTeamId(match.homeTeamId)}
                  className={`flex-1 text-right text-sm hover:underline truncate px-1 font-serif ${match.homeTeamId === userTeamId ? 'font-bold text-accent' : 'text-ink'}`}
                >
                  {homeTeam?.name || '???'}
                </button>

                <div 
                  onClick={() => match.played && setSelectedMatch(match)}
                  className={`
                    px-3 py-1 font-mono font-bold text-xs rounded-full mx-2 min-w-[3.5rem] text-center border transition-all
                    ${match.played ? 'bg-paper-dark border-gray-300 text-ink cursor-pointer hover:bg-gray-200' : 'bg-transparent border-transparent text-gray-400'}
                  `}
                >
                  {match.played ? `${match.homeScore} - ${match.awayScore}` : 'VS'}
                </div>

                <button 
                  onClick={() => setSelectedTeamId(match.awayTeamId)}
                  className={`flex-1 text-left text-sm hover:underline truncate px-1 font-serif ${match.awayTeamId === userTeamId ? 'font-bold text-accent' : 'text-ink'}`}
                >
                  {awayTeam?.name || '???'}
                </button>
              </div>

              {/* Statut */}
              {match.played && (
                <div className="absolute -top-2 -right-2 bg-white rounded-full text-green-600 shadow-sm">
                  <CheckCircle2 size={18} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedMatch && (
        <MatchReport
          match={selectedMatch}
          homeTeam={teams[selectedMatch.homeTeamId]}
          awayTeam={teams[selectedMatch.awayTeamId]}
          onClose={() => setSelectedMatch(null)}
        />
      )}

      {selectedTeamId && (
        <ClubDetails teamId={selectedTeamId} onClose={() => setSelectedTeamId(null)} />
      )}
    </div>
  );
}
