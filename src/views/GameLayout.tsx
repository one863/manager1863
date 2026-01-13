import { useState, useRef, useEffect } from 'preact/hooks';
import Dashboard from '@/views/Dashboard';
import Squad from '@/views/Squad'; 
import LeagueTable from '@/views/LeagueTable'; 
import Calendar from '@/views/Calendar';
import MatchLive from '@/components/MatchLive'; 
import Training from '@/views/Training'; 
import NewsList from '@/views/News/NewsList';
import TransferMarket from '@/views/Transfers/TransferMarket';
import ClubManagement from '@/views/Club/ClubManagement';
import SponsorsFinances from '@/views/Club/SponsorsFinances';
import { useGameStore } from '@/store/gameSlice';
import { verifySaveIntegrity } from '@/db/db';
import { useTranslation } from 'react-i18next';
import { 
  Home, 
  Users, 
  Trophy, 
  Calendar as CalendarIcon, 
  LogOut, 
  ChevronRight,
  Loader2,
  Newspaper,
  ShoppingCart,
  Building2,
  Coins,
  Menu,
  X,
  Dumbbell,
  Save,
  CheckCircle2
} from 'lucide-preact';

type View = 'dashboard' | 'squad' | 'league' | 'calendar' | 'match' | 'training' | 'news' | 'transfers' | 'club' | 'finances';

export default function GameLayout({ onQuit }: { onQuit: () => void }) {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'verified' | 'error'>('idle');
  const { t } = useTranslation();
  
  const currentDate = useGameStore(state => state.currentDate);
  const currentSaveId = useGameStore(state => state.currentSaveId);
  const isProcessing = useGameStore(state => state.isProcessing);
  const advanceDate = useGameStore(state => state.advanceDate);
  const liveMatch = useGameStore(state => state.liveMatch);
  
  const menuRef = useRef<HTMLDivElement>(null);

  const handleContinue = async () => {
    try {
      setSaveStatus('saving');
      // Petit délai pour l'effet visuel
      await new Promise(resolve => setTimeout(resolve, 600));
      
      await advanceDate();
      
      // VÉRIFICATION DE L'INTÉGRITÉ (Anti-triche + Succès écriture)
      if (currentSaveId) {
        const isValid = await verifySaveIntegrity(currentSaveId);
        if (isValid) {
          setSaveStatus('verified');
          await new Promise(resolve => setTimeout(resolve, 800)); // Laisser le temps de voir le "Check"
        } else {
          setSaveStatus('error');
          console.error("Erreur d'intégrité détectée lors de la sauvegarde.");
        }
      }
      
      const state = useGameStore.getState();
      if (state.liveMatch) {
        setSaveStatus('idle');
        return;
      }

      if (!['dashboard', 'news', 'transfers'].includes(currentView)) {
          setCurrentView('dashboard');
      }
    } catch (error) {
      console.error("Erreur lors de l'avancement du jour:", error);
      setSaveStatus('error');
    } finally {
      setTimeout(() => setSaveStatus('idle'), 300);
    }
  };

  const navigateTo = (view: View) => {
    setCurrentView(view);
    setIsMenuOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  if (liveMatch) {
    return <MatchLive />;
  }

  const showOverlay = saveStatus !== 'idle';

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-paper border-x border-paper-dark shadow-2xl overflow-hidden relative">
      {/* Header */}
      <header className="bg-paper-dark p-4 border-b border-gray-300 flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 hover:bg-white/50 rounded-full transition-colors text-accent"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <h1 className="text-xl font-serif font-bold text-accent tracking-tight">1863</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="text-xs font-mono text-ink-light bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm">
            {t('game.date_format', { date: currentDate })}
          </div>
          
          <button 
             onClick={handleContinue}
             disabled={isProcessing || showOverlay}
             className="bg-accent text-white font-bold py-1.5 px-3 rounded-full shadow-sm flex items-center gap-1 hover:scale-105 active:scale-95 transition-transform disabled:opacity-70 disabled:scale-100"
           >
             {isProcessing || showOverlay ? (
               <Loader2 size={16} className="animate-spin" />
             ) : (
               <ChevronRight size={18} strokeWidth={3} />
             )}
           </button>
        </div>
      </header>

      {/* Overlay de Sauvegarde / Transition Dynamique */}
      {showOverlay && (
        <div className="absolute inset-0 bg-paper/80 backdrop-blur-md z-[100] flex flex-col items-center justify-center animate-fade-in text-center">
           <div className="bg-white p-8 rounded-2xl shadow-2xl border-2 border-accent/20 flex flex-col items-center gap-4 min-w-[240px]">
              
              {saveStatus === 'saving' && (
                <>
                  <Save size={48} className="text-accent animate-pulse" />
                  <div>
                    <p className="font-serif font-bold text-xl text-ink">Journal de Bord</p>
                    <p className="text-sm text-ink-light italic">Mise à jour des archives...</p>
                  </div>
                  <div className="w-32 h-1 bg-gray-100 rounded-full overflow-hidden mt-2">
                    <div className="h-full bg-accent animate-progress-indefinite w-1/2"></div>
                  </div>
                </>
              )}

              {saveStatus === 'verified' && (
                <div className="animate-bounce-in flex flex-col items-center gap-3">
                  <CheckCircle2 size={56} className="text-green-600" />
                  <div>
                    <p className="font-serif font-bold text-xl text-ink">Progression Sauvée</p>
                    <p className="text-sm text-green-700 font-medium">Signature numérique vérifiée</p>
                  </div>
                </div>
              )}

              {saveStatus === 'error' && (
                <div className="flex flex-col items-center gap-3">
                  <X size={56} className="text-red-600" />
                  <div>
                    <p className="font-serif font-bold text-xl text-ink">Erreur Critique</p>
                    <p className="text-sm text-red-600">Échec de l'écriture en base</p>
                  </div>
                </div>
              )}
              
           </div>
        </div>
      )}

      {/* Menu Déroulant */}
      {isMenuOpen && (
        <>
          <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px] z-40 transition-opacity animate-fade-in" onClick={() => setIsMenuOpen(false)} />
          <div 
            ref={menuRef}
            className="absolute top-16 left-4 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden animate-slide-up"
          >
            <div className="p-2 space-y-1">
              <MenuLink icon={CalendarIcon} label="Calendrier" active={currentView === 'calendar'} onClick={() => navigateTo('calendar')} />
              <MenuLink icon={Dumbbell} label="Entraînement" active={currentView === 'training'} onClick={() => navigateTo('training')} />
              <MenuLink icon={Building2} label="Infrastructures" active={currentView === 'club'} onClick={() => navigateTo('club')} />
              <MenuLink icon={Coins} label="Finances & Sponsors" active={currentView === 'finances'} onClick={() => navigateTo('finances')} />
              <div className="border-t border-gray-100 my-1" />
              <button 
                onClick={onQuit}
                className="w-full flex items-center gap-3 p-3 text-red-600 hover:bg-red-50 transition-colors rounded-lg font-bold text-sm"
              >
                <LogOut size={18} />
                Quitter la partie
              </button>
            </div>
          </div>
        </>
      )}

      <main className="flex-1 overflow-y-auto p-4 mb-16 scroll-smooth">
        {renderView(currentView)}
      </main>
      
      <nav className="bg-paper-dark border-t border-gray-300 pb-safe absolute bottom-0 w-full z-30">
        <ul className="flex justify-around items-center h-16 px-4">
          <NavIcon icon={Home} label={t('game.office')} active={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} />
          <NavIcon icon={Users} label={t('game.squad')} active={currentView === 'squad'} onClick={() => setCurrentView('squad')} />
          <li className="relative -mt-8">
            <button 
              onClick={() => setCurrentView('news')}
              className={`flex flex-col items-center justify-center bg-paper border-2 ${currentView === 'news' ? 'border-accent text-accent' : 'border-gray-300 text-ink-light'} rounded-full h-14 w-14 shadow-lg active:scale-90 transition-all`}
            >
              <Newspaper size={24} />
            </button>
          </li>
          <NavIcon icon={ShoppingCart} label="Mercato" active={currentView === 'transfers'} onClick={() => setCurrentView('transfers')} />
          <NavIcon icon={Trophy} label={t('game.league')} active={currentView === 'league'} onClick={() => setCurrentView('league')} />
        </ul>
      </nav>
    </div>
  );
}

function NavIcon({ icon: Icon, label, active, onClick }: any) {
  return (
    <li>
      <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-accent scale-110' : 'text-ink-light hover:text-ink'}`}>
        <Icon size={20} strokeWidth={active ? 2.5 : 2} />
        <span className="text-[9px] font-bold uppercase tracking-tighter">{label}</span>
      </button>
    </li>
  );
}

function MenuLink({ icon: Icon, label, active, onClick }: any) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 p-3 transition-colors rounded-lg text-sm font-medium ${active ? 'bg-accent/10 text-accent font-bold' : 'text-ink hover:bg-gray-50'}`}>
      <Icon size={18} />
      {label}
    </button>
  );
}

function renderView(view: View) {
  switch (view) {
    case 'dashboard': return <Dashboard />;
    case 'squad': return <Squad />;
    case 'league': return <LeagueTable />; 
    case 'calendar': return <Calendar />;
    case 'training': return <Training />;
    case 'news': return <NewsList />;
    case 'transfers': return <TransferMarket />;
    case 'club': return <ClubManagement />;
    case 'finances': return <SponsorsFinances />;
    default: return <Dashboard />;
  }
}
