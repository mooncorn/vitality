import type { ReactNode } from 'react';
import { useWakeLock } from '@/hooks/useWakeLock';
import { useForceLandscape } from '@/hooks/useForceLandscape';
import { useGameStore } from '@/store/gameStore';

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const allowSleep = useGameStore(state => state.settings.allowSleep);
  const isPortrait = useForceLandscape();

  // Keep screen awake when allowSleep is false
  useWakeLock(!allowSleep);

  // When in portrait, rotate the container 90deg and swap width/height
  // This makes it appear as if the app is always in landscape
  if (isPortrait) {
    return (
      <div
        className="bg-black overflow-hidden touch-none select-none"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          width: '100dvh',
          height: '100dvw',
          transform: 'translate(-50%, -50%) rotate(90deg)',
          transformOrigin: 'center center',
        }}
      >
        {children}
      </div>
    );
  }

  return (
    <div className="w-screen bg-black overflow-hidden touch-none select-none" style={{ height: '100dvh' }}>
      {children}
    </div>
  );
};
