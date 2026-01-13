import { useState, useEffect } from 'preact/hooks';
import MainMenu from '@/views/MainMenu';
import GameLayout from '@/views/GameLayout';
import CreateTeam from '@/views/CreateTeam';
import LoadGame from '@/views/LoadGame';
import { useGameStore } from '@/store/gameSlice';
import { db } from '@/db/db';

type AppState = 'menu' | 'create' | 'load' | 'game' | 'initializing';

export function App() {
  const [appState, setAppState] = useState<AppState>('initializing');
  const currentSaveId = useGameStore((state) => state.currentSaveId);
  const loadGame = useGameStore((state) => state.loadGame);

  // Tentative de restauration de la session au démarrage
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const lastSave = await db.saveSlots.orderBy('lastPlayedDate').last();
        if (lastSave && lastSave.id !== undefined) {
          const success = await loadGame(lastSave.id);
          if (success) {
            setAppState('game');
            return;
          }
        }
      } catch (e) {
        console.error("Failed to restore session", e);
      }
      setAppState('menu');
    };
    
    restoreSession();
  }, []);

  // Sécurité : si on a un ID de sauvegarde actif mais qu'on est sur le menu (ex: après un refresh),
  // on restaure l'affichage du jeu.
  useEffect(() => {
    if (currentSaveId && (appState === 'menu' || appState === 'initializing')) {
      setAppState('game');
    }
  }, [currentSaveId]);

  const handleNewGameClick = () => setAppState('create');
  const handleGameCreated = () => setAppState('game');
  const handleLoadGameClick = () => setAppState('load');
  const handleCancel = () => setAppState('menu');
  const handleQuit = () => setAppState('menu');

  const handleGameLoaded = async (slotId: number) => {
    const success = await loadGame(slotId);
    if (success) setAppState('game');
    else alert('Erreur lors du chargement de la sauvegarde !');
  };

  if (appState === 'initializing') {
    return <div className="h-screen bg-paper flex items-center justify-center font-serif italic text-ink-light">Chargement des archives...</div>;
  }

  switch (appState) {
    case 'menu': return <MainMenu onNewGame={handleNewGameClick} onLoadGame={handleLoadGameClick} />;
    case 'create': return <CreateTeam onGameCreated={handleGameCreated} onCancel={handleCancel} />;
    case 'load': return <LoadGame onGameLoaded={handleGameLoaded} onCancel={handleCancel} />;
    case 'game': return <GameLayout onQuit={handleQuit} />;
    default: return <MainMenu onNewGame={handleNewGameClick} onLoadGame={handleLoadGameClick} />;
  }
}
