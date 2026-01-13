import { useState, useEffect } from 'preact/hooks';
import MainMenu from '@/views/MainMenu';
import GameLayout from '@/views/GameLayout';
import CreateTeam from '@/views/CreateTeam';
import LoadGame from '@/views/LoadGame';
import { useGameStore } from '@/store/gameSlice';

type AppState = 'menu' | 'create' | 'load' | 'game';

export function App() {
  const [appState, setAppState] = useState<AppState>('menu');
  const currentSaveId = useGameStore((state) => state.currentSaveId);
  const loadGame = useGameStore((state) => state.loadGame);

  // Sécurité : si on a un ID de sauvegarde actif mais qu'on est sur le menu (ex: après un refresh),
  // on restaure l'affichage du jeu.
  useEffect(() => {
    if (currentSaveId && appState === 'menu') {
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

  switch (appState) {
    case 'menu': return <MainMenu onNewGame={handleNewGameClick} onLoadGame={handleLoadGameClick} />;
    case 'create': return <CreateTeam onGameCreated={handleGameCreated} onCancel={handleCancel} />;
    case 'load': return <LoadGame onGameLoaded={handleGameLoaded} onCancel={handleCancel} />;
    case 'game': return <GameLayout onQuit={handleQuit} />;
    default: return <MainMenu onNewGame={handleNewGameClick} onLoadGame={handleLoadGameClick} />;
  }
}
