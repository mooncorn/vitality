export type OverlayType =
  | 'playerSettings'
  | 'counterToggle'
  | 'gameMenu'
  | 'settings'
  | 'commanderAttacker'
  | 'commanderTarget'
  | 'diceRoll';

export interface OverlayConfig {
  type: OverlayType;
  playerId?: string;
  priority: number;
  closeable: boolean;
  backdrop: 'blur' | 'dark' | 'gradient' | 'none';
  portal: boolean;
}

// Overlay priorities (higher = takes precedence)
export const OVERLAY_PRIORITIES: Record<OverlayType, number> = {
  diceRoll: 100,           // Highest - game-wide mode
  commanderAttacker: 90,
  commanderTarget: 90,
  gameMenu: 80,            // Full-screen menu
  settings: 70,            // Settings modal
  playerSettings: 60,      // Player-specific overlay
  counterToggle: 50,       // Lowest - within card
};
