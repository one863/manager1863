import { Home, Users, Newspaper, ShoppingCart, Trophy, Dumbbell, Construction } from 'lucide-preact';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '@/store/gameSlice';
import { useEffect, useState } from 'preact/hooks';
import { db } from '@/db/db';

interface NavigationProps {
  currentView: string;
  onNavigate: (view: any) => void;
}

export function Navigation({ currentView, onNavigate }: NavigationProps) {
  const { t } = useTranslation();
  const unreadCount = useGameStore(state => state.unreadNewsCount);
  const userTeamId = useGameStore(state => state.userTeamId);
  const day = useGameStore(state => state.day);
  
  const [hasActiveProject, setHasActiveProject] = useState(false);

  useEffect(() => {
    const checkProjects = async () => {
      if (!userTeamId) return;
      const team = await db.teams.get(userTeamId);
      if (team) {
        const training = !!(team.trainingEndDay && team.trainingEndDay > day);
        const stadium = !!(team.stadiumUpgradeEndDay && team.stadiumUpgradeEndDay > day);
        setHasActiveProject(training || stadium);
      }
    };
    checkProjects();
  }, [userTeamId, day, currentView]);

  return (
    <nav className="bg-paper-dark border-t border-gray-300 pb-safe absolute bottom-0 w-full z-30 shadow-[0_-5px_10px_rgba(0,0,0,0.02)]">
      <ul className="flex justify-around items-center h-16 px-2">
        <NavIcon
          icon={Home}
          label={t('game.office')}
          active={currentView === 'dashboard'}
          onClick={() => onNavigate('dashboard')}
        />
        <NavIcon
          icon={Users}
          label={t('game.squad')}
          active={currentView === 'squad'}
          onClick={() => onNavigate('squad')}
        />
        
        {/* Central Action Button */}
        <li className="relative -mt-6">
          <button
            onClick={() => onNavigate('news')}
            className={`flex flex-col items-center justify-center bg-paper border-4 ${currentView === 'news' ? 'border-black text-black' : 'border-gray-200 text-ink-light'} rounded-full h-16 w-16 shadow-lg active:scale-95 transition-all`}
          >
            <Newspaper size={24} className={currentView === 'news' ? 'animate-pulse' : ''} />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center border-2 border-paper animate-bounce shadow-sm">
                {unreadCount}
              </span>
            )}
          </button>
        </li>

        <NavIcon
          icon={Dumbbell}
          label="Entrain."
          active={currentView === 'training'}
          onClick={() => onNavigate('training')}
          dot={hasActiveProject}
        />
        <NavIcon
          icon={Trophy}
          label={t('game.league')}
          active={currentView === 'league' || currentView === 'match-report'}
          onClick={() => onNavigate('league')}
        />
      </ul>
    </nav>
  );
}

function NavIcon({ icon: Icon, label, active, onClick, dot }: any) {
  return (
    <li>
      <button
        onClick={onClick}
        className={`flex flex-col items-center justify-center gap-1 transition-all relative w-16 h-full py-1 rounded-xl active:bg-gray-200/50 ${active ? 'text-black' : 'text-ink-light hover:text-ink'}`}
      >
        <div className={`transition-transform duration-200 ${active ? '-translate-y-1' : ''}`}>
           <Icon size={22} strokeWidth={active ? 2.5 : 2} />
        </div>
        <span className={`text-[9px] font-bold uppercase tracking-tighter transition-opacity ${active ? 'opacity-100' : 'opacity-70'}`}>
          {label}
        </span>
        {dot && (
           <span className="absolute top-2 right-4 w-2 h-2 bg-black rounded-full border border-paper-dark animate-pulse"></span>
        )}
      </button>
    </li>
  );
}
