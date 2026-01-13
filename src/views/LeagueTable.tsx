import { useState, useEffect } from 'preact/hooks';
import { db, Team, League } from '@/db/db';
import { useGameStore } from '@/store/gameSlice';
import { useTranslation } from 'react-i18next';
import { Trophy, ChevronLeft, ChevronRight } from 'lucide-preact';
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
      if (!currentSaveId || !userTeamId) return;

      try {
        // 1. Récupérer toutes les ligues
        const allLeagues = await db.leagues
          .where('saveId')
          .equals(currentSaveId)
          .sortBy('level');
        
        setLeagues(allLeagues);

        // 2. Trouver l'équipe du joueur pour connaître sa ligue
        const userTeam = await db.teams.get(userTeamId);
        if (userTeam) {
          const userLeagueIndex = allLeagues.findIndex(l => l.id === userTeam.leagueId);
          if (userLeagueIndex !== -1) {
            setCurrentLeagueIndex(userLeagueIndex);
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

        const teams = await db.teams
          .where('[saveId+leagueId]')
          .equals([currentSaveId, targetLeagueId])
          .toArray();

        // Calculer les stats (pour l'instant, c'est juste placeholder comme avant)
        // TODO: Vraiment calculer les stats basées sur db.matches
        const rows: TableRow[] = teams.map((team) => ({
          ...team,
          won: 0, 
          drawn: 0,
          lost: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDiff: 0,
        }));

        rows.sort((a, b) => {
          if ((b.points || 0) !== (a.points || 0))
            return (b.points || 0) - (a.points || 0);
          return (b.reputation || 0) - (a.reputation || 0);
        });

        if (isMounted) {
          setTable(rows);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Failed to load league table", error);
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
              {leagues[currentLeagueIndex].name}
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-paper-dark text-[10px] uppercase font-bold text-ink-light border-b border-gray-300">
                <tr>
                  <th className="px-3 py-3 text-center w-10">Pos</th>
                  <th className="px-3 py-3">{t('league_table.club')}</th>
                  <th className="px-2 py-3 text-center w-10">{t('league_table.p')}</th>
                  <th className="px-3 py-3 text-center w-12 font-bold text-ink bg-paper-dark/50 italic">
                    {t('league_table.pts')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {table.map((row, index) => (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedTeamId(row.id!)}
                    className={`cursor-pointer ${row.id === userTeamId ? 'bg-accent/5 font-bold ring-1 ring-inset ring-accent/20' : ''} hover:bg-gray-50 transition-colors`}
                  >
                    <td className="px-3 py-4 text-center text-ink-light font-mono text-xs border-r border-gray-100/50">
                      {index + 1}
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-2">
                        {(index === 0 && leagues[currentLeagueIndex].level === 1) && <Trophy size={12} className="text-yellow-600" />}
                        <span className="text-ink truncate max-w-[140px]">{row.name}</span>
                      </div>
                    </td>
                    <td className="px-2 py-4 text-center text-ink-light font-mono text-xs">
                      {row.matchesPlayed || 0}
                    </td>
                    <td className="px-3 py-4 text-center font-bold text-accent bg-accent/5 italic border-l border-gray-100/50">
                      {row.points || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 px-4 py-3 bg-paper-dark/30 rounded-lg border border-dashed border-gray-300 text-[10px] text-ink-light text-center italic">
            * Selon les règles de 1863 : Victoire = 2 pts, Nul = 1 pt.
          </div>
        </>
      )}

      {selectedTeamId && (
        <ClubDetails teamId={selectedTeamId} onClose={() => setSelectedTeamId(null)} />
      )}
    </div>
  );
}
