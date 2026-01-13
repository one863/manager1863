import { useState, useEffect } from 'preact/hooks';
import { db, Team, Match, League } from '@/db/db';
import { useGameStore } from '@/store/gameSlice';
import { useTranslation } from 'react-i18next';
import ClubIdentityCard from '@/components/Dashboard/ClubIdentityCard';
import NextMatchCard from '@/components/Dashboard/NextMatchCard';
import { BoardObjectiveCard } from '@/components/Dashboard/BoardObjectiveCard';
import { TrendingUp, Users, ShoppingCart, Newspaper, AlertTriangle } from 'lucide-preact';

export default function Dashboard({ onNavigate }: { onNavigate?: (view: any) => void }) {
  const { t } = useTranslation();
  const currentSaveId = useGameStore((state) => state.currentSaveId);
  const userTeamId = useGameStore((state) => state.userTeamId);
  const currentDate = useGameStore((state) => state.currentDate);

  const [team, setTeam] = useState<Team | null>(null);
  const [league, setLeague] = useState<League | null>(null);
  const [nextMatch, setNextMatch] = useState<{ match: Match; opponent: Team; } | null>(null);
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
          setPosition(leagueTeams.findIndex((t) => t.id === userTeamId) + 1);
          
          const futureMatches = await db.matches.where('[saveId+date]').between([currentSaveId, currentDate], [currentSaveId, new Date('2100-01-01')]).toArray();
          const myNextMatch = futureMatches.find((m) => (m.homeTeamId === userTeamId || m.awayTeamId === userTeamId) && !m.played);
          if (myNextMatch) {
            const opponentId = myNextMatch.homeTeamId === userTeamId ? myNextMatch.awayTeamId : myNextMatch.homeTeamId;
            const opponent = await db.teams.get(opponentId);
            if (opponent) setNextMatch({ match: myNextMatch, opponent });
          }
        }
      } catch (e) { console.error(e); } finally { setIsLoading(false); }
    };
    loadDashboardData();
  }, [currentSaveId, userTeamId, currentDate]);

  const isMatchToday = nextMatch && new Date(nextMatch.match.date).toDateString() === currentDate.toDateString();

  if (isLoading) return <div className="p-8 text-center animate-pulse">{t('game.loading')}</div>;

  return (
    <div className="space-y-6 pb-24">
      {/* BANNIÈRE ALERTE JOUR DE MATCH */}
      {isMatchToday && (
        <div className="bg-accent p-4 rounded-2xl text-white shadow-lg flex items-center justify-between animate-bounce-in">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-full"><AlertTriangle size={20} /></div>
            <div>
              <p className="font-serif font-bold text-sm leading-tight uppercase">Jour de Match !</p>
              <p className="text-[10px] opacity-90 italic">Préparez vos titulaires avant de jouer.</p>
            </div>
          </div>
          <button onClick={() => onNavigate?.('squad')} className="bg-white text-accent px-4 py-1.5 rounded-full text-[10px] font-bold shadow-sm hover:scale-105 transition-transform">
             TÉLÉGRAPHE TACTIQUE
          </button>
        </div>
      )}

      {/* CLIC SUR CLUB -> CLUB MANAGEMENT */}
      <ClubIdentityCard 
        team={team} league={league} position={position} 
        onClick={() => onNavigate?.('club')} 
      />

      <BoardObjectiveCard team={team} position={position} />

      {/* CLIC SUR MATCH -> SQUAD (TACTIQUE) */}
      <NextMatchCard 
        nextMatch={nextMatch} userTeamId={userTeamId} userTeamName={team?.name || ''} 
        currentDate={currentDate}
        onClick={() => onNavigate?.('squad')} 
      />

      {/* RACCOURCIS ÉPURÉS */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => onNavigate?.('news')} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3 hover:border-accent group">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors"><Newspaper size={18} /></div>
          <span className="text-xs font-bold text-ink uppercase tracking-tighter">Lire la Presse</span>
        </button>
        <button onClick={() => onNavigate?.('transfers')} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3 hover:border-accent group">
          <div className="p-2 bg-orange-50 text-orange-600 rounded-lg group-hover:bg-orange-600 group-hover:text-white transition-colors"><ShoppingCart size={18} /></div>
          <span className="text-xs font-bold text-ink uppercase tracking-tighter">Recrutement</span>
        </button>
      </div>

      <div className="p-4 bg-paper-dark/30 rounded-2xl border border-dashed border-gray-300 text-center">
        <p className="text-[10px] text-ink-light italic uppercase tracking-widest font-bold">
          "The Football Association - Est. 1863"
        </p>
      </div>
    </div>
  );
}
