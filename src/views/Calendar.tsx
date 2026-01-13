import { useState, useEffect } from 'preact/hooks';
import { db, Match, Team } from '@/db/db';
import { useGameStore } from '@/store/gameSlice';
import { useTranslation } from 'react-i18next';
import MatchReport from '@/components/MatchReport';

export default function Calendar() {
  const { t } = useTranslation();
  const currentSaveId = useGameStore((state) => state.currentSaveId);
  const userTeamId = useGameStore((state) => state.userTeamId);

  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Record<number, Team>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  useEffect(() => {
    const loadData = async () => {
      // Si pas de saveId, on attend
      if (currentSaveId === null) {
        setIsLoading(false);
        return;
      }

      try {
        // 1. Charger les équipes
        const allTeams = await db.teams
          .where('saveId')
          .equals(currentSaveId)
          .toArray();
        const teamsMap: Record<number, Team> = {};
        allTeams.forEach((team) => {
          if (team.id) teamsMap[team.id] = team;
        });
        setTeams(teamsMap);

        // 2. Charger les matchs via l'index simple 'saveId' (plus robuste)
        const allMatches = await db.matches
          .where('saveId')
          .equals(currentSaveId)
          .toArray();

        // Tri manuel par date
        allMatches.sort((a, b) => a.date.getTime() - b.date.getTime());

        console.log(`Calendrier chargé : ${allMatches.length} matchs trouvés.`);
        setMatches(allMatches);
      } catch (error) {
        console.error('Erreur chargement calendrier:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [currentSaveId]);

  if (isLoading)
    return (
      <div className="p-8 text-center animate-pulse">{t('game.loading')}</div>
    );

  const matchesByMonth: Record<string, Match[]> = {};
  matches.forEach((match) => {
    const monthKey = match.date.toLocaleDateString(undefined, {
      month: 'long',
      year: 'numeric',
    });
    if (!matchesByMonth[monthKey]) matchesByMonth[monthKey] = [];
    matchesByMonth[monthKey].push(match);
  });

  return (
    <div className="pb-20 space-y-6">
      <div className="flex justify-between items-center mb-4 px-2">
        <h2 className="text-xl font-serif font-bold text-ink">
          {t('calendar.title')}
        </h2>
      </div>

      {matches.length === 0 ? (
        <div className="p-8 text-center bg-white rounded border border-gray-200 space-y-2">
          <p className="text-ink-light italic">{t('calendar.no_matches')}</p>
          <p className="text-xs text-red-500">
            (Si vous venez de créer une partie, assurez-vous d'avoir utilisé
            "Nouvelle Carrière" après la dernière mise à jour)
          </p>
        </div>
      ) : (
        Object.entries(matchesByMonth).map(([month, monthMatches]) => (
          <div
            key={month}
            className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
          >
            <div className="bg-paper-dark px-4 py-2 font-bold text-ink border-b border-gray-200 capitalize sticky top-0">
              {month}
            </div>
            <div className="divide-y divide-gray-100">
              {monthMatches.map((match) => {
                const homeTeam = teams[match.homeTeamId];
                const awayTeam = teams[match.awayTeamId];
                const isUserMatch =
                  match.homeTeamId === userTeamId ||
                  match.awayTeamId === userTeamId;

                return (
                  <div
                    key={match.id}
                    onClick={() => match.played && setSelectedMatch(match)}
                    className={`p-3 flex items-center justify-between transition-colors ${isUserMatch ? 'bg-yellow-50' : ''} ${match.played ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                  >
                    <div className="text-xs text-ink-light w-12 text-center">
                      {match.date.getDate()}
                    </div>

                    <div className="flex-1 flex items-center justify-between px-2">
                      <span
                        className={`flex-1 text-right text-sm ${match.homeTeamId === userTeamId ? 'font-bold text-accent' : 'text-ink'}`}
                      >
                        {homeTeam?.name || '???'}
                      </span>

                      <div
                        className={`px-3 font-mono font-bold text-sm rounded mx-2 min-w-[3rem] text-center py-1 border 
                        ${match.played ? 'bg-paper-dark border-gray-300 text-ink' : 'bg-transparent border-transparent text-gray-400'}`}
                      >
                        {match.played
                          ? `${match.homeScore} - ${match.awayScore}`
                          : 'vs'}
                      </div>

                      <span
                        className={`flex-1 text-left text-sm ${match.awayTeamId === userTeamId ? 'font-bold text-accent' : 'text-ink'}`}
                      >
                        {awayTeam?.name || '???'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {selectedMatch && (
        <MatchReport
          match={selectedMatch}
          homeTeam={teams[selectedMatch.homeTeamId]}
          awayTeam={teams[selectedMatch.awayTeamId]}
          onClose={() => setSelectedMatch(null)}
        />
      )}
    </div>
  );
}
