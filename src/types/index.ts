// Counter Types
export type CounterType = 'life' | 'poison' | 'energy' | 'commander' | 'experience' | 'radiation';

// Player Theme
export interface PlayerTheme {
  primaryColor: string;      // Text/icon color (usually white)
  backgroundColor: string;   // Card background color
}

// Individual Counter State
export interface CounterState {
  id: string;
  type: CounterType;
  value: number;
  label?: string;
  icon?: string;
}

// Commander Damage Tracking (per-opponent)
// Maps sourcePlayerId -> damage received FROM that opponent
export interface CommanderDamageState {
  [sourcePlayerId: string]: number;
}

// Player Model
export interface Player {
  id: string;
  name: string;
  theme: PlayerTheme;
  counters: CounterState[];
  commanderDamage: CommanderDamageState;
  activeCounterIndex: number;
  enabledSecondaryCounters: CounterType[];
}

// Game Settings
export interface GameSettings {
  startingLife: 20 | 30 | 40;
  allowSleep: boolean;
  playerCount: number;
}

// Game Mode
export type GameMode = 'menu' | 'local' | 'multiplayer';

// Game State
export interface GameState {
  players: Player[];
  settings: GameSettings;
  gameMode: GameMode;
}

// Game Actions
export interface GameActions {
  // Player management
  setPlayerCount: (count: number) => void;

  // Counter operations
  updateCounter: (playerId: string, counterType: CounterType, delta: number) => void;
  setCounter: (playerId: string, counterType: CounterType, value: number) => void;

  // Commander damage (per-opponent)
  updateCommanderDamage: (targetPlayerId: string, sourcePlayerId: string, delta: number) => void;

  // Player customization
  setPlayerName: (playerId: string, name: string) => void;
  setPlayerTheme: (playerId: string, theme: Partial<PlayerTheme>) => void;
  setActiveCounter: (playerId: string, index: number) => void;
  toggleSecondaryCounter: (playerId: string, counterType: CounterType, enabled: boolean) => void;

  // Game management
  updateSettings: (settings: Partial<GameSettings>) => void;
  resetGame: () => void;
  resetCounters: () => void;

  // Game mode
  setGameMode: (mode: GameMode) => void;

  // Multiplayer
  applyRemoteState: (players: Player[], settings: GameSettings) => void;
}

// Combined Store Type
export type GameStore = GameState & GameActions;

// Commander attack mode state
export interface CommanderAttackModeState {
  isActive: boolean;
  attackingPlayerId: string | null;
  attackerRotation: number;
}
