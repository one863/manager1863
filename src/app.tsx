import { useState, useEffect } from 'preact/hooks';
import MainMenu from '@/views/MainMenu';
import GameLayout from '@/views/GameLayout';
import CreateTeam from '@/views/CreateTeam';
import LoadGame from '@/views/LoadGame';
import { useGameStore } from '@/store/gameSlice';

type AppState = 'menu' | 'create' | 'load' | 'game';

export function App() {
  const [appState, setAppState] = useState<AppState>('menu');
  const loadGame = useGameStore(state => state.loadGame);

  const handleNewGameClick = () => {
    setAppState('create');
  };

  const handleGameCreated = () => {
    setAppState('game');
  };

  // Clic sur "Charger une partie" depuis le menu
  const handleLoadGameClick = () => {
    setAppState('load');
  };

  // Callback quand une partie est sélectionnée depuis l'écran LoadGame
  const handleGameLoaded = async (slotId: number) => {
    console.log(`Chargement du slot ${slotId}...`);
    const success = await loadGame(slotId);
    if (success) {
      setAppState('game');
    } else {
      alert("Erreur lors du chargement de la sauvegarde !");
    }
  };

  const handleQuit = () => {
    setAppState('menu');
  };

  const handleCancel = () => {
    setAppState('menu');
  };

  switch (appState) {
    case 'menu':
      return <MainMenu onNewGame={handleNewGameClick} onLoadGame={handleLoadGameClick} />;
    case 'create':
      return <CreateTeam onGameCreated={handleGameCreated} onCancel={handleCancel} />;
    case 'load':
      return <LoadGame onGameLoaded={handleGameLoaded} onCancel={handleCancel} />;
    case 'game':
      return <GameLayout onQuit={handleQuit} />;
    default:
      return <MainMenu onNewGame={handleNewGameClick} onLoadGame={handleLoadGameClick} />;
  }
}
