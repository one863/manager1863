import { useState, useEffect, useRef } from 'preact/hooks';
import { db, Match, Team, League } from '@/db/db';
import { useGameStore } from '@/store/gameSlice';
import { useTranslation } from 'react-i18next';
import ClubDetails from '@/components/ClubDetails';
import { Calendar as CalendarIcon, Trophy, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-preact';

interface CalendarProps {
  onSelectMatch: (matchId: number) => void;
  hideHeader?: boolean;
}

export default function Calendar({ onSelectMatch, hideHeader = false }: CalendarProps) {
  const { t } = useTranslation();
  const currentSaveId = useGameStore((state) => state.currentSaveId);
  const userTeamId = useGameStore((state) => state.userTeamId);
  const currentDay = useGameStore((state) => state.day);

  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Record<number, Team>>({});
  const [leagues, setLeagues] = useState<League[]>([]);
  const [currentLeagueIndex, setCurrentLeagueIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);

  const nextMatchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      if (!currentSaveId) return;

      try {
        const allTeamsInSave = await db.teams
          .where('saveId')
          .equals(currentSaveId)
          .toArray();

        const activeLeagueIds = new Set(allTeamsInSave.map(t => t.leagueId));
        const allLeaguesPotentially = await db.leagues
          .where('saveId')
          .equals(currentSaveId)
          .sortBy('level');
        
        const activeLeagues = allLeaguesPotentially.filter(l => activeLeagueIds.has(l.id!));
        
        if (activeLeagues.length === 0) {
            setLeagues(allLeaguesPotentially);
        } else {
            setLeagues(activeLeagues);
        }

        if (userTeamId) {
          const userTeam = await db.teams.get(userTeamId);
          if (userTeam) {
            // eslint-disable-next-line eqeqeq
            const userLeagueIndex = activeLeagues.findIndex(l => l.id == userTeam.leagueId);
            if (userLeagueIndex !== -1) {
              setCurrentLeagueIndex(userLeagueIndex);
            }
          }
        }
      } catch (error) {
        console.error("Failed to init calendar leagues", error);
      }
    };
    init();
  }, [currentSaveId, userTeamId]);

  useEffect(() => {
    const loadData = async () => {
      if (currentSaveId === null || leagues.length === 0) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const targetLeagueId = leagues[currentLeagueIndex].id!;

        const allTeams = await db.teams.where('saveId').equals(currentSaveId).toArray();
        const teamsMap: Record<number, Team> = {};
        allTeams.forEach((team) => { if (team.id) teamsMap[team.id] = team; });
        setTeams(teamsMap);

        // eslint-disable-next-line eqeqeq
        const leagueMatches = await db.matches
          .where('saveId')
          .equals(currentSaveId)
          .filter(m => m.leagueId == targetLeagueId)
          .toArray();
        
        leagueMatches.sort((a, b) => a.day - b.day);
        setMatches(leagueMatches);
      } catch (error) {
        console.error('Erreur chargement calendrier:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [currentSaveId, leagues, currentLeagueIndex]);

  useEffect(() => {
      if (!isLoading && nextMatchRef.current) {
          const timer = setTimeout(() => {
              nextMatchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 300);
          return () => clearTimeout(timer);
      }
  }, [isLoading]);

  const handlePrevLeague = () => {
    setCurrentLeagueIndex(prev => Math.max(0, prev - 1));
  };

  const handleNextLeague = () => {
    setCurrentLeagueIndex(prev => Math.min(leagues.length - 1, prev + 1));
  };

  const matchesByDay = matches.reduce((acc, match) => {
    if (!acc[match.day]) {
      acc[match.day] = [];
    }
    acc[match.day].push(match);
    return acc;
  }, {} as Record<number, Match[]>);

  const days = Object.keys(matchesByDay).map(Number).sort((a, b) => a - b);
  const nextActiveDay = days.find(d => d >= currentDay) || days[days.length - 1];

  if (isLoading && leagues.length === 0) return <div className="p-8 text-center animate-pulse">{t('game.loading')}</div>;

  return (
    <div className="animate-fade-in">
      {!hideHeader && (
        <div className="flex flex-col gap-4 mb-4 px-2">
            <h2 className="text-xl font-serif font-bold text-ink flex items-center gap-2">
              <CalendarIcon className="text-black" />
              Programme de la Saison
            </h2>
            <p className="text-[10px] text-ink-light uppercase tracking-widest font-bold">Chronologie des rencontres</p>
        </div>
      )}

      {leagues.length > 0 && (
          <div className="flex items-center justify-between bg-white p-2 rounded-lg shadow-sm border border-gray-200 mb-6">
            <button 
              onClick={handlePrevLeague}
              disabled={currentLeagueIndex === 0}
              className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="font-serif font-bold text-ink text-sm">
              {leagues[currentLeagueIndex]?.name || 'Unknown League'}
            </span>
            <button 
              onClick={handleNextLeague}
              disabled={currentLeagueIndex === leagues.length - 1}
              className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
            >
              <ChevronRight size={20} />
            </button>
          </div>
      )}

      {isLoading ? (
        <div className="p-8 text-center animate-pulse">
           <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
           <p className="text-xs italic text-ink-light">Chargement du calendrier...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {days.map((day, index) => (
            <div key={day} className="space-y-3" ref={day === nextActiveDay ? nextMatchRef : null}>
              <div className="flex items-center gap-4 px-2">
                <div className={`
                  px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider
                  ${day < currentDay ? 'bg-gray-200 text-gray-500' : day === currentDay ? 'bg-black text-white' : 'bg-paper-dark text-ink'}
                `}>
                  Journée {index + 1}
                  <span className="ml-2 opacity-50 font-normal normal-case italic">(Jour {day})</span>
                </div>
                <div className="h-px flex-1 bg-gray-200"></div>
              </div>
              
              <div className="grid gap-2">
                {matchesByDay[day].map((match) => {
                  const homeTeam = teams[match.homeTeamId];
                  const awayTeam = teams[match.awayTeamId];
                  const isUserMatch = match.homeTeamId === userTeamId || match.awayTeamId === userTeamId;
                  const isToday = match.day === currentDay;

                  return (
                    <div
                      key={match.id}
                      className={`
                        group relative bg-white rounded-xl border-2 transition-all p-3 flex items-center gap-4
                        ${isUserMatch ? 'border-black shadow-sm' : 'border-gray-100 opacity-60'}
                        ${isToday ? 'ring-2 ring-black ring-offset-2' : ''}
                      `}
                    >
                      <div className="flex-1 flex items-center justify-between overflow-hidden">
                        <button 
                          onClick={() => setSelectedTeamId(match.homeTeamId)}
                          className={`flex-1 text-right text-xs hover:underline truncate px-1 font-serif ${match.homeTeamId === userTeamId ? 'font-bold text-black' : 'text-ink'}`}
                        >
                          {homeTeam?.name || '???'}
                        </button>

                        <div 
                          onClick={() => match.played && onSelectMatch(match.id!)}
                          className={`
                            px-2 py-1 font-mono font-bold text-xs rounded-lg mx-2 min-w-[3rem] text-center border transition-all
                            ${match.played ? 'bg-paper-dark border-gray-300 text-ink cursor-pointer hover:bg-gray-200' : 'bg-transparent border-transparent text-gray-400'}
                          `}
                        >
                          {match.played ? `${match.homeScore} - ${match.awayScore}` : 'VS'}
                        </div>

                        <button 
                          onClick={() => setSelectedTeamId(match.awayTeamId)}
                          className={`flex-1 text-left text-xs hover:underline truncate px-1 font-serif ${match.awayTeamId === userTeamId ? 'font-bold text-black' : 'text-ink'}`}
                        >
                          {awayTeam?.name || '???'}
                        </button>
                      </div>

                      {match.played && (
                        <div className="flex-shrink-0 text-green-600">
                          <CheckCircle2 size={16} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {days.length === 0 && (
            <div className="p-8 text-center text-ink-light italic">
              Aucun match trouvé pour cette ligue.
            </div>
          )}
        </div>
      )}

      {selectedTeamId && (
        <ClubDetails teamId={selectedTeamId} onClose={() => setSelectedTeamId(null)} />
      )}
    </div>
  );
}
