import { useState, useEffect } from 'preact/hooks';
import { db, Team, League } from '@/db/db';
import { useGameStore } from '@/store/gameSlice';
import { useTranslation } from 'react-i18next';
import { Trophy, ChevronLeft, ChevronRight, ArrowUp, ArrowDown } from 'lucide-preact';
import ClubDetails from '@/components/ClubDetails';

interface TableRow extends Team {
  goalDiff: number;
  goalsFor: number;
  goalsAgainst: number;
  won: number;
  drawn: number;
  lost: number;
}

export default function LeagueTable() {
  const { t } = useTranslation();
  const currentSaveId = useGameStore((state) => state.currentSaveId);
  const userTeamId = useGameStore((state) => state.userTeamId);

  const [table, setTable] = useState<TableRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  
  const [leagues, setLeagues] = useState<League[]>([]);
  const [currentLeagueIndex, setCurrentLeagueIndex] = useState(0);

  // Charger les ligues et déterminer la ligue du joueur
  useEffect(() => {
    const init = async () => {
      if (!currentSaveId) return;

      try {
        // 1. Récupérer d'abord TOUTES les équipes de la sauvegarde pour identifier les ligues actives
        const allTeamsInSave = await db.teams
          .where('saveId')
          .equals(currentSaveId)
          .toArray();

        // Extraire les IDs de ligues qui ont réellement des équipes
        const activeLeagueIds = new Set(allTeamsInSave.map(t => t.leagueId));

        // 2. Récupérer toutes les ligues potentielles
        const allLeaguesPotentially = await db.leagues
          .where('saveId')
          .equals(currentSaveId)
          .sortBy('level');
        
        // 3. NE GARDER QUE les ligues actives (qui contiennent des équipes)
        // Cela élimine les centaines de ligues fantômes
        const activeLeagues = allLeaguesPotentially.filter(l => activeLeagueIds.has(l.id!));
        
        if (activeLeagues.length === 0) {
            // Fallback si jamais (ex: début de partie sans équipes générées ?)
            setLeagues(allLeaguesPotentially);
        } else {
            setLeagues(activeLeagues);
        }

        // 4. Trouver l'équipe du joueur pour connaître sa ligue et positionner l'index
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
        console.error("Failed to init league table", error);
      }
    };
    init();
  }, [currentSaveId, userTeamId]);

  // Charger le classement quand l'index de ligue change
  useEffect(() => {
    let isMounted = true;
    const loadTable = async () => {
      if (currentSaveId === null || leagues.length === 0) return;

      setIsLoading(true);
      try {
        const targetLeagueId = leagues[currentLeagueIndex].id!;

        // METHODE ROBUSTE: Récupérer TOUTES les équipes du save
        const allTeamsInSave = await db.teams
          .where('saveId')
          .equals(currentSaveId)
          .toArray();
        
        // Filtrage souple (==) pour gérer string/number mismatch éventuel
        // eslint-disable-next-line eqeqeq
        const teams = allTeamsInSave.filter(t => t.leagueId == targetLeagueId);

        // Fetch matches
        const allMatchesInSave = await db.matches
           .where('saveId')
           .equals(currentSaveId)
           .filter(m => !!m.played)
           .toArray();

        // eslint-disable-next-line eqeqeq
        const matches = allMatchesInSave.filter(m => m.leagueId == targetLeagueId);

        // Calculer les stats
        const rows: TableRow[] = teams.map((team) => {
           let won = 0, drawn = 0, lost = 0, gf = 0, ga = 0;
           
           matches.forEach(m => {
             // eslint-disable-next-line eqeqeq
             if (m.homeTeamId == team.id) {
               gf += m.homeScore;
               ga += m.awayScore;
               if (m.homeScore > m.awayScore) won++;
               else if (m.homeScore === m.awayScore) drawn++;
               else lost++;
             // eslint-disable-next-line eqeqeq
             } else if (m.awayTeamId == team.id) {
               gf += m.awayScore;
               ga += m.homeScore;
               if (m.awayScore > m.homeScore) won++;
               else if (m.awayScore === m.homeScore) drawn++;
               else lost++;
             }
           });

           return {
             ...team,
             won, drawn, lost, goalsFor: gf, goalsAgainst: ga, goalDiff: gf - ga
           };
        });

        rows.sort((a, b) => {
          if ((b.points || 0) !== (a.points || 0))
            return (b.points || 0) - (a.points || 0);
          if (b.goalDiff !== a.goalDiff)
             return b.goalDiff - a.goalDiff;
          return (b.reputation || 0) - (a.reputation || 0);
        });

        if (isMounted) {
          setTable(rows);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Failed to load league table", error);
        if (isMounted) setIsLoading(false);
      }
    };

    loadTable();
    return () => { isMounted = false; };
  }, [currentSaveId, leagues, currentLeagueIndex]);

  const handlePrevLeague = () => {
    setCurrentLeagueIndex(prev => Math.max(0, prev - 1));
  };

  const handleNextLeague = () => {
    setCurrentLeagueIndex(prev => Math.min(leagues.length - 1, prev + 1));
  };

  const getPositionStyle = (index: number) => {
    if (leagues.length === 0) return '';
    const league = leagues[currentLeagueIndex];
    
    if (league.promotionSpots > 0 && index < league.promotionSpots) {
      return 'border-l-4 border-green-500 bg-green-50/50';
    }
    
    if (league.relegationSpots > 0 && index >= table.length - league.relegationSpots) {
      return 'border-l-4 border-red-500 bg-red-50/50';
    }

    return 'border-l-4 border-transparent';
  };

  if (isLoading && leagues.length === 0)
    return (
      <div className="p-8 text-center animate-pulse flex flex-col items-center gap-2">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
        <span className="font-serif italic text-ink-light">{t('game.loading')}</span>
      </div>
    );

  return (
    <div className="pb-20 animate-fade-in">
      {/* Header avec sélecteur de ligue */}
      <div className="flex flex-col gap-4 mb-6 px-2">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-serif font-bold text-ink flex items-center gap-2">
            <Trophy size={20} className="text-accent" />
            {t('league_table.title')}
          </h2>
        </div>

        {leagues.length > 0 && (
          <div className="flex items-center justify-between bg-white p-2 rounded-lg shadow-sm border border-gray-200">
            <button 
              onClick={handlePrevLeague}
              disabled={currentLeagueIndex === 0}
              className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="font-serif font-bold text-ink">
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
      </div>

      {isLoading ? (
        <div className="p-8 text-center animate-pulse">
           <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
           <p className="text-xs italic text-ink-light">Chargement du classement...</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse min-w-[350px]">
              <thead className="bg-paper-dark text-[10px] uppercase font-bold text-ink-light border-b border-gray-300">
                <tr>
                  <th className="px-2 py-3 text-center w-8">Pos</th>
                  <th className="px-2 py-3">{t('league_table.club')}</th>
                  <th className="px-1 py-3 text-center w-8 hidden sm:table-cell" title="Matchs Joués">{t('league_table.p')}</th>
                  <th className="px-1 py-3 text-center w-8" title="Gagnés">G</th>
                  <th className="px-1 py-3 text-center w-8" title="Nuls">N</th>
                  <th className="px-1 py-3 text-center w-8" title="Perdus">P</th>
                  <th className="px-1 py-3 text-center w-8 hidden sm:table-cell" title="Différence de buts">Diff</th>
                  <th className="px-2 py-3 text-center w-10 font-bold text-ink bg-paper-dark/50 italic">
                    {t('league_table.pts')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {table.length > 0 ? (
                  table.map((row, index) => (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedTeamId(row.id!)}
                      className={`cursor-pointer ${row.id === userTeamId ? 'bg-accent/5 font-bold ring-1 ring-inset ring-accent/20' : ''} hover:bg-gray-50 transition-colors ${getPositionStyle(index)}`}
                    >
                      <td className="px-2 py-4 text-center text-ink-light font-mono text-xs border-r border-gray-100/50 relative">
                        {index + 1}
                        {leagues[currentLeagueIndex].promotionSpots > 0 && index < leagues[currentLeagueIndex].promotionSpots && (
                            <ArrowUp size={10} className="absolute top-2 right-1 text-green-500 opacity-50" />
                        )}
                         {leagues[currentLeagueIndex].relegationSpots > 0 && index >= table.length - leagues[currentLeagueIndex].relegationSpots && (
                            <ArrowDown size={10} className="absolute top-2 right-1 text-red-500 opacity-50" />
                        )}
                      </td>
                      <td className="px-2 py-4">
                        <div className="flex items-center gap-2">
                          {(index === 0 && leagues[currentLeagueIndex].level === 1) && <Trophy size={12} className="text-yellow-600" />}
                          <span className="text-ink truncate max-w-[120px] sm:max-w-none">{row.name}</span>
                        </div>
                      </td>
                      <td className="px-1 py-4 text-center text-ink-light font-mono text-xs hidden sm:table-cell">
                        {row.matchesPlayed || 0}
                      </td>
                      <td className="px-1 py-4 text-center text-ink-light font-mono text-xs">
                        {row.won}
                      </td>
                      <td className="px-1 py-4 text-center text-ink-light font-mono text-xs">
                        {row.drawn}
                      </td>
                      <td className="px-1 py-4 text-center text-ink-light font-mono text-xs">
                        {row.lost}
                      </td>
                       <td className="px-1 py-4 text-center text-ink-light font-mono text-xs hidden sm:table-cell">
                        {row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}
                      </td>
                      <td className="px-2 py-4 text-center font-bold text-accent bg-accent/5 italic border-l border-gray-100/50">
                        {row.points || 0}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-ink-light italic">
                      Aucune équipe trouvée dans cette ligue.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-6 px-4 py-3 bg-paper-dark/30 rounded-lg border border-dashed border-gray-300 text-[10px] text-ink-light text-center italic">
            * Victoire = 3 pts, Nul = 1 pt.
          </div>
        </>
      )}

      {selectedTeamId && (
        <ClubDetails teamId={selectedTeamId} onClose={() => setSelectedTeamId(null)} />
      )}
    </div>
  );
}
