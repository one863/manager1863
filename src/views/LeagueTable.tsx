import { useState, useEffect } from 'preact/hooks';
import { db, Team } from '@/db/db';
import { useGameStore } from '@/store/gameSlice';
import { useTranslation } from 'react-i18next';

// Interface étendue pour le calcul (si on veut recalculer à la volée, mais ici on utilise les champs stockés)
// On ajoute diff de buts car elle n'est pas stockée explicitement
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

  useEffect(() => {
    const loadTable = async () => {
      if (currentSaveId === null) return;

      // Charger les équipes
      const teams = await db.teams
        .where('saveId')
        .equals(currentSaveId)
        .toArray();

      // Calculer le classement
      // Pour l'instant, on se base sur les champs stockés (qui sont mis à jour après chaque match)
      // Mais comme ces champs n'existent pas encore tous (j'ai mis points/matchesPlayed seulement),
      // il faudra les ajouter ou les calculer via les matchs joués.
      // Pour simplifier cette V1, on simule les colonnes manquantes.

      const rows: TableRow[] = teams.map((team) => ({
        ...team,
        won: 0, // À implémenter
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDiff: 0,
      }));

      // Trier : Points > Diff > Buts Pour
      rows.sort((a, b) => {
        if ((b.points || 0) !== (a.points || 0))
          return (b.points || 0) - (a.points || 0);
        return 0; // Égalité parfaite au début
      });

      setTable(rows);
      setIsLoading(false);
    };

    loadTable();
  }, [currentSaveId]);

  if (isLoading)
    return (
      <div className="p-8 text-center animate-pulse">{t('game.loading')}</div>
    );

  return (
    <div className="pb-20">
      <div className="flex justify-between items-center mb-4 px-2">
        <h2 className="text-xl font-serif font-bold text-ink">
          {t('league_table.title')}
        </h2>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-paper-dark text-xs uppercase font-bold text-ink-light border-b border-gray-300">
            <tr>
              <th className="px-3 py-2 text-center w-8">#</th>
              <th className="px-3 py-2">{t('league_table.club')}</th>
              <th className="px-2 py-2 text-center w-8">
                {t('league_table.p')}
              </th>
              <th className="px-2 py-2 text-center w-8 font-bold text-ink">
                {t('league_table.pts')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {table.map((row, index) => (
              <tr
                key={row.id}
                className={`${row.id === userTeamId ? 'bg-yellow-50 font-bold' : ''} hover:bg-gray-50`}
              >
                <td className="px-3 py-3 text-center text-ink-light border-r border-gray-100">
                  {index + 1}
                </td>
                <td className="px-3 py-3">
                  <div className="text-ink">{row.name}</div>
                </td>
                <td className="px-2 py-3 text-center text-ink-light">
                  {row.matchesPlayed || 0}
                </td>
                <td className="px-2 py-3 text-center font-bold text-accent">
                  {row.points || 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 px-4 text-xs text-ink-light text-center italic">
        * Victoire = 2 pts (Règle 1863), Nul = 1 pt.
      </div>
    </div>
  );
}
