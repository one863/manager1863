import { useState, useEffect } from 'preact/hooks';
import { db, Team, Match, League } from '@/db/db';
import { useGameStore } from '@/store/gameSlice';
import { useTranslation } from 'react-i18next';
import ClubIdentityCard from '@/components/Dashboard/ClubIdentityCard';
import NextMatchCard from '@/components/Dashboard/NextMatchCard';

export default function Dashboard() {
  const { t } = useTranslation();
  
  const currentSaveId = useGameStore(state => state.currentSaveId);
  const userTeamId = useGameStore(state => state.userTeamId);
  const currentDate = useGameStore(state => state.currentDate);

  const [team, setTeam] = useState<Team | null>(null);
  const [league, setLeague] = useState<League | null>(null);
  const [nextMatch, setNextMatch] = useState<{ match: Match, opponent: Team } | null>(null);
  const [position, setPosition] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!currentSaveId || !userTeamId) return;

      try {
        const userTeam = await db.teams.get(userTeamId);
        setTeam(userTeam || null);

        if (userTeam) {
          const userLeague = await db.leagues.get(userTeam.leagueId);
          setLeague(userLeague || null);

          const leagueTeams = await db.teams.where('leagueId').equals(userTeam.leagueId).toArray();
          leagueTeams.sort((a, b) => (b.points || 0) - (a.points || 0));
          const pos = leagueTeams.findIndex(t => t.id === userTeamId) + 1;
          setPosition(pos);

          const futureMatches = await db.matches
            .where('[saveId+date]')
            .between([currentSaveId, currentDate], [currentSaveId, new Date('2100-01-01')])
            .toArray();
            
          const myNextMatch = futureMatches.find(m => 
            (m.homeTeamId === userTeamId || m.awayTeamId === userTeamId) && !m.played
          );

          if (myNextMatch) {
            const opponentId = myNextMatch.homeTeamId === userTeamId ? myNextMatch.awayTeamId : myNextMatch.homeTeamId;
            const opponent = await db.teams.get(opponentId);
            if (opponent) {
              setNextMatch({ match: myNextMatch, opponent });
            }
          } else {
            setNextMatch(null);
          }
        }
      } catch (e) {
        console.error("Erreur dashboard:", e);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [currentSaveId, userTeamId, currentDate]);

  if (isLoading) return <div className="p-8 text-center animate-pulse">{t('game.loading')}</div>;

  return (
    <div className="space-y-6">
      <ClubIdentityCard 
        team={team} 
        league={league} 
        position={position} 
      />

      <NextMatchCard 
        nextMatch={nextMatch} 
        userTeamId={userTeamId} 
        userTeamName={team?.name || ''} 
      />

      {/* Actualités (News) */}
      <div>
        <h3 className="text-sm font-bold text-ink-light uppercase tracking-wider mb-3">{t('dashboard.news')}</h3>
        <div className="space-y-2">
          <div className="bg-white p-3 rounded border-l-4 border-accent shadow-sm">
            <h4 className="font-bold text-sm mb-1">{t('dashboard.welcome_title')}</h4>
            <p className="text-sm text-ink-light leading-relaxed">
              {t('dashboard.welcome_msg')}
              <br/>
              Le président vous fait confiance pour mener {team?.name} vers la victoire.
            </p>
            <span className="text-xs text-gray-400 mt-2 block">{t('dashboard.ago')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
