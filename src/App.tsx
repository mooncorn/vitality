import { Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PlayerGrid } from '@/components/layout/PlayerGrid';
import { GameMenu } from '@/components/game/GameMenu';
import { MainMenu } from '@/components/menu/MainMenu';
import { OverlayProvider } from '@/contexts/OverlayContext';
import { useGameStore } from '@/store/gameStore';
import { useMultiplayerStore } from '@/store/multiplayerStore';

function App() {
  const gameMode = useGameStore(state => state.gameMode);
  const lobbyInfo = useMultiplayerStore(state => state.lobbyInfo);

  // MainMenu is rendered outside AppLayout so it's not affected by landscape rotation
  if (gameMode === 'menu') {
    return <MainMenu />;
  }

  // Show loading state while waiting for lobby sync
  if (gameMode === 'multiplayer' && !lobbyInfo) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-zinc-900">
        <Loader2 className="w-12 h-12 animate-spin text-white/50" />
      </div>
    );
  }

  return (
    <OverlayProvider>
      <AppLayout>
        <PlayerGrid />
        <GameMenu />
      </AppLayout>
    </OverlayProvider>
  );
}

export default App;
