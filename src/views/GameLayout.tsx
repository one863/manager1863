import { useState, useRef, useEffect, lazy, Suspense } from 'preact/compat';
import { useGameStore } from '@/store/gameSlice';
import { useLiveMatchStore } from '@/store/liveMatchStore';
import { verifySaveIntegrity } from '@/db/db';
import { MatchService } from '@/services/match-service';
import { Loader2 } from 'lucide-preact';

import { Header } from '@/components/Layout/Header';
import { Navigation } from '@/components/Layout/Navigation';
import { SidebarMenu } from '@/components/Layout/SidebarMenu';
import { SaveOverlay } from '@/components/Layout/SaveOverlay';
import { GameOverOverlay } from '@/components/Layout/GameOverOverlay';
import { MatchReadyOverlay } from '@/components/Layout/MatchReadyOverlay';

// Importations dynamiques
const Dashboard = lazy(() => import('@/views/Dashboard'));
const Squad = lazy(() => import('@/views/Squad'));
const LeagueTable = lazy(() => import('@/views/LeagueTable'));
const Calendar = lazy(() => import('@/views/Calendar'));
const MatchLive = lazy(() => import('@/components/MatchLive'));
const Training = lazy(() => import('@/views/Training'));
const NewsList = lazy(() => import('@/views/News/NewsList'));
const TransferMarket = lazy(() => import('@/views/Transfers/TransferMarket'));
const ClubManagement = lazy(() => import('@/views/Club/ClubManagement'));
const SponsorsFinances = lazy(() => import('@/views/Club/SponsorsFinances'));

type View = 'dashboard' | 'squad' | 'league' | 'calendar' | 'match' | 'training' | 'news' | 'transfers' | 'club' | 'finances';

export default function GameLayout({ onQuit }: { onQuit: () => void }) {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'verified' | 'error'>('idle');
  const [showMatchConfirm, setShowMatchConfirm] = useState(false);

  const currentDate = useGameStore((state) => state.currentDate);
  const currentSaveId = useGameStore((state) => state.currentSaveId);
  const userTeamId = useGameStore((state) => state.userTeamId);
  const isProcessing = useGameStore((state) => state.isProcessing);
  const isGameOver = useGameStore((state) => state.isGameOver);
  const advanceDate = useGameStore((state) => state.advanceDate);
  const deleteSaveAndQuit = useGameStore((state) => state.deleteSaveAndQuit);
  
  // Utilisation du nouveau store pour le match en direct
  const liveMatch = useLiveMatchStore((state) => state.liveMatch);

  // Fermer l'overlay si un match commence
  useEffect(() => {
    if (liveMatch) {
      setShowMatchConfirm(false);
    }
  }, [liveMatch]);

  const handleContinueClick = async () => {
    if (isGameOver || isProcessing) return;
    
    if (currentSaveId && userTeamId) {
      const hasMatch = await MatchService.hasUserMatchToday(currentSaveId, currentDate, userTeamId);
      if (hasMatch) {
        setShowMatchConfirm(true);
        return;
      }
    }
    
    executeContinue();
  };

  const executeContinue = async () => {
    setShowMatchConfirm(false); // S'assurer que l'overlay est fermé avant de lancer la simulation
    try {
      setSaveStatus('saving');
      // Petit délai pour laisser l'UI respirer
      await new Promise((resolve) => setTimeout(resolve, 300));
      await advanceDate();

      if (currentSaveId) {
        const isValid = await verifySaveIntegrity(currentSaveId);
        setSaveStatus(isValid ? 'verified' : 'error');
        if (isValid) await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Si le store dit qu'on est en match, on ne change pas la vue ici
      if (useLiveMatchStore.getState().liveMatch) {
        setSaveStatus('idle');
        return;
      }
      setCurrentView('dashboard');
    } catch (error) {
      console.error("Simulation error:", error);
      setSaveStatus('error');
    } finally {
      setTimeout(() => setSaveStatus('idle'), 300);
    }
  };

  const handleRestart = async () => {
    await deleteSaveAndQuit();
    onQuit();
  };

  const handlePrepareTeam = () => {
    setShowMatchConfirm(false);
    setCurrentView('squad');
  };

  // Si on est en plein match live, on affiche uniquement le MatchLive
  if (liveMatch) {
    return (
      <Suspense fallback={<ViewLoader />}>
        <MatchLive />
      </Suspense>
    );
  }

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-paper border-x border-paper-dark shadow-2xl overflow-hidden relative">
      {isGameOver && <GameOverOverlay onRestart={handleRestart} />}
      
      {/* OVERLAY DE VALIDATION DE MATCH */}
      {showMatchConfirm && (
        <MatchReadyOverlay 
          onConfirm={executeContinue}
          onPrepare={handlePrepareTeam}
        />
      )}

      <Header 
        currentDate={currentDate}
        isProcessing={isProcessing}
        showOverlay={saveStatus !== 'idle'}
        isMenuOpen={isMenuOpen}
        onToggleMenu={() => setIsMenuOpen(!isMenuOpen)}
        onContinue={handleContinueClick}
      />

      {saveStatus !== 'idle' && <SaveOverlay status={saveStatus} />}

      {isMenuOpen && (
        <SidebarMenu 
          currentView={currentView}
          onNavigate={(view) => { setCurrentView(view); setIsMenuOpen(false); }}
          onQuit={onQuit}
          onClose={() => setIsMenuOpen(false)}
        />
      )}

      <main className="flex-1 overflow-y-auto p-4 mb-16 scroll-smooth">
        <Suspense fallback={<ViewLoader />}>
          {renderView(currentView, setCurrentView)}
        </Suspense>
      </main>

      <Navigation 
        currentView={currentView}
        onNavigate={(view) => setCurrentView(view)}
      />
    </div>
  );
}

function ViewLoader() {
  return (
    <div className="flex flex-col items-center justify-center h-full animate-pulse">
      <Loader2 size={32} className="text-accent animate-spin mb-2" />
      <p className="text-ink-light text-xs italic font-serif">Déploiement des archives...</p>
    </div>
  );
}

function renderView(view: View, setView: (v: View) => void) {
  switch (view) {
    case 'dashboard': return <Dashboard onNavigate={setView} />;
    case 'squad': return <Squad />;
    case 'league': return <LeagueTable />;
    case 'calendar': return <Calendar />;
    case 'training': return <Training />;
    case 'news': return <NewsList />;
    case 'transfers': return <TransferMarket />;
    case 'club': return <ClubManagement />;
    case 'finances': return <SponsorsFinances />;
    default: return <Dashboard onNavigate={setView} />;
  }
}
