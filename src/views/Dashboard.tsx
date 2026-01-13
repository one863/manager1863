import { useState, useEffect } from 'preact/hooks';
import { db, Team, Match, League } from '@/db/db';
import { useGameStore } from '@/store/gameSlice';
import { useTranslation } from 'react-i18next';
import ClubIdentityCard from '@/components/Dashboard/ClubIdentityCard';
import NextMatchCard from '@/components/Dashboard/NextMatchCard';
import { BoardObjectiveCard } from '@/components/Dashboard/BoardObjectiveCard';
import ClubDetails from '@/components/ClubDetails';
import { TrendingUp, Users, ShoppingCart, Newspaper, AlertTriangle, Calendar as CalendarIcon } from 'lucide-preact';

export default function Dashboard({ onNavigate }: { onNavigate?: (view: any) => void }) {
  const { t } = useTranslation();
  const currentSaveId = useGameStore((state) => state.currentSaveId);
  const userTeamId = useGameStore((state) => state.userTeamId);
  const day = useGameStore((state) => state.day);
  const season = useGameStore((state) => state.season);
  const currentDate = useGameStore((state) => state.currentDate);

  const [team, setTeam] = useState<Team | null>(null);
  const [league, setLeague] = useState<League | null>(null);
  const [nextMatch, setNextMatch] = useState<{ match: Match; opponent: Team; } | null>(null);
  const [position, setPosition] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [seasonLength, setSeasonLength] = useState(100);

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
          setPosition(leagueTeams.findIndex((t) => t.id === userTeamId) + 1);
          
          const futureMatches = await db.matches
            .where('[saveId+day]')
            .between([currentSaveId, day], [currentSaveId, 999])
            .toArray();
            
          const myNextMatch = futureMatches.find((m) => (m.homeTeamId === userTeamId || m.awayTeamId === userTeamId) && !m.played);
          if (myNextMatch) {
            const opponentId = myNextMatch.homeTeamId === userTeamId ? myNextMatch.awayTeamId : myNextMatch.homeTeamId;
            const opponent = await db.teams.get(opponentId);
            if (opponent) setNextMatch({ match: myNextMatch, opponent });
          }

          const lastMatch = await db.matches.where('saveId').equals(currentSaveId).reverse().first();
          if (lastMatch) setSeasonLength(lastMatch.day);
        }
      } catch (e) { console.error(e); } finally { setIsLoading(false); }
    };
    loadDashboardData();
  }, [currentSaveId, userTeamId, day]);

  const isMatchToday = nextMatch && nextMatch.match.day === day;
  const seasonProgress = Math.min(100, (day / seasonLength) * 100);

  if (isLoading) return <div className="p-8 text-center animate-pulse">{t('game.loading')}</div>;

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      <div className="px-2">
        <div className="flex justify-between items-end mb-1.5">
          <div className="flex items-center gap-2 text-accent font-serif font-bold">
            <CalendarIcon size={16} />
            <span>{t('dashboard.season', { season })}</span>
          </div>
          <span className="text-[10px] font-bold text-ink-light uppercase">{t('dashboard.progress', { progress: Math.round(seasonProgress) })}</span>
        </div>
        <div className="h-2 bg-paper-dark rounded-full overflow-hidden border border-gray-200 shadow-inner">
          <div 
            className="h-full bg-accent transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(var(--color-accent),0.3)]" 
            style={{ width: `${seasonProgress}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 px-0.5">
           <span className="text-[9px] text-ink-light font-bold">{t('dashboard.day', { day: 1 })}</span>
           <span className="text-[9px] text-ink-light font-bold">{t('dashboard.end_day', { day: seasonLength })}</span>
        </div>
      </div>

      {isMatchToday && (
        <div className="bg-accent p-4 rounded-2xl text-white shadow-lg flex items-center justify-between animate-bounce-in">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-full"><AlertTriangle size={20} /></div>
            <div>
              <p className="font-serif font-bold text-sm leading-tight uppercase">{t('dashboard.match_day')}</p>
              <p className="text-[10px] opacity-90 italic">{t('dashboard.prepare_lineup')}</p>
            </div>
          </div>
          <button onClick={() => onNavigate?.('squad')} className="bg-white text-accent px-4 py-1.5 rounded-full text-[10px] font-bold shadow-sm hover:scale-105 transition-transform">
             {t('dashboard.tactics_btn')}
          </button>
        </div>
      )}

      <ClubIdentityCard 
        team={team} league={league} position={position} 
        onClick={() => onNavigate?.('club')} 
      />

      <BoardObjectiveCard team={team} position={position} />

      <NextMatchCard 
        nextMatch={nextMatch} userTeamId={userTeamId} userTeamName={team?.name || ''} 
        currentDate={currentDate}
        onShowOpponent={setSelectedTeamId}
      />

      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => onNavigate?.('news')} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3 hover:border-accent group">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors"><Newspaper size={18} /></div>
          <span className="text-xs font-bold text-ink uppercase tracking-tighter">{t('dashboard.press_btn')}</span>
        </button>
        <button onClick={() => onNavigate?.('transfers')} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3 hover:border-accent group">
          <div className="p-2 bg-orange-50 text-orange-600 rounded-lg group-hover:bg-orange-600 group-hover:text-white transition-colors"><ShoppingCart size={18} /></div>
          <span className="text-xs font-bold text-ink uppercase tracking-tighter">{t('dashboard.market_btn')}</span>
        </button>
      </div>

      {selectedTeamId && (
        <ClubDetails teamId={selectedTeamId} onClose={() => setSelectedTeamId(null)} />
      )}
    </div>
  );
}
