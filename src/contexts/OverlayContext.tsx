import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';

type AppOverlayType = 'gameMenu' | 'settings';

interface OverlayState {
  gameMenu: boolean;
  settings: boolean;
}

interface AppOverlayContextValue {
  // State
  overlayState: OverlayState;

  // Actions
  openOverlay: (type: AppOverlayType) => void;
  closeOverlay: (type: AppOverlayType) => void;
  closeAll: () => void;

  // Queries
  isOpen: (type: AppOverlayType) => boolean;
  anyOpen: () => boolean;
}

const initialState: OverlayState = {
  gameMenu: false,
  settings: false,
};

const AppOverlayContext = createContext<AppOverlayContextValue | null>(null);

interface OverlayProviderProps {
  children: ReactNode;
}

export const OverlayProvider = ({ children }: OverlayProviderProps) => {
  const [overlayState, setOverlayState] = useState<OverlayState>(initialState);

  const openOverlay = useCallback((type: AppOverlayType) => {
    // Close all other overlays when opening a new one
    setOverlayState({
      gameMenu: type === 'gameMenu',
      settings: type === 'settings',
    });
  }, []);

  const closeOverlay = useCallback((type: AppOverlayType) => {
    setOverlayState(prev => ({
      ...prev,
      [type]: false,
    }));
  }, []);

  const closeAll = useCallback(() => {
    setOverlayState(initialState);
  }, []);

  const isOpen = useCallback(
    (type: AppOverlayType) => overlayState[type],
    [overlayState]
  );

  const anyOpen = useCallback(
    () => Object.values(overlayState).some(Boolean),
    [overlayState]
  );

  const value = useMemo<AppOverlayContextValue>(
    () => ({
      overlayState,
      openOverlay,
      closeOverlay,
      closeAll,
      isOpen,
      anyOpen,
    }),
    [overlayState, openOverlay, closeOverlay, closeAll, isOpen, anyOpen]
  );

  return (
    <AppOverlayContext.Provider value={value}>
      {children}
    </AppOverlayContext.Provider>
  );
};

export const useOverlay = (): AppOverlayContextValue => {
  const context = useContext(AppOverlayContext);
  if (!context) {
    throw new Error('useOverlay must be used within an OverlayProvider');
  }
  return context;
};

// Convenience hooks for specific overlays
export const useGameMenuOverlay = () => {
  const { isOpen, openOverlay, closeOverlay } = useOverlay();
  return {
    isOpen: isOpen('gameMenu'),
    open: () => openOverlay('gameMenu'),
    close: () => closeOverlay('gameMenu'),
  };
};

export const useSettingsOverlay = () => {
  const { isOpen, openOverlay, closeOverlay } = useOverlay();
  return {
    isOpen: isOpen('settings'),
    open: () => openOverlay('settings'),
    close: () => closeOverlay('settings'),
  };
};
