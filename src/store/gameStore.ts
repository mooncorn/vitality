import { create } from 'zustand';
import type { GameStore, Player, CounterType, PlayerTheme, GameSettings, CommanderDamageState, GameMode, CommanderAttackModeState, HighrollModeState } from '@/types';
import type { GameAction } from '@/types/multiplayer';
import { generateId } from '@/utils/id';
import { getDefaultCounters } from '@/utils/counter';
import { getColorPreset } from '@/utils/colors';

// Multiplayer bridge - will be set by multiplayerStore
type ActionSender = (action: GameAction) => void;
type MultiplayerChecker = () => boolean;
type HostChecker = () => boolean;

let _sendAction: ActionSender | null = null;
let _isMultiplayer: MultiplayerChecker | null = null;
let _isHost: HostChecker | null = null;
let _broadcastState: (() => void) | null = null;

// Called by multiplayerStore to register itself
export const registerMultiplayerBridge = (
  sendFn: ActionSender,
  checkFn: MultiplayerChecker,
  hostCheckFn: HostChecker
) => {
  _sendAction = sendFn;
  _isMultiplayer = checkFn;
  _isHost = hostCheckFn;
};

// Called by multiplayerStore to register broadcast callback
export const registerBroadcastCallback = (broadcastFn: () => void) => {
  _broadcastState = broadcastFn;
};

const isMultiplayer = () => _isMultiplayer?.() ?? false;
const isHost = () => _isHost?.() ?? false;
const sendAction = (action: GameAction) => _sendAction?.(action);
const broadcastState = () => _broadcastState?.();

// Helper to save session to localStorage
const saveSessionToStorage = (sessionId: string, players: Player[], settings: GameSettings) => {
  try {
    const stored = localStorage.getItem('lobbies');
    const lobbies = stored ? JSON.parse(stored) : [];
    const updated = lobbies.map((l: { id: string }) =>
      l.id === sessionId
        ? { ...l, gameState: { players, settings } }
        : l
    );
    localStorage.setItem('lobbies', JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save session to localStorage:', err);
  }
};

// Helper to save current state if in local mode with a session
const saveCurrentState = (get: () => ExtendedGameStore) => {
  const { gameMode, currentSessionId, players, settings } = get();
  if (gameMode === 'local' && currentSessionId) {
    saveSessionToStorage(currentSessionId, players, settings);
  }
};

export const DEFAULT_SETTINGS: GameSettings = {
  startingLife: 40,
  allowSleep: false,
  playerCount: 2,
};

// Create default players for a fresh game
export const createDefaultPlayers = () => createPlayers(DEFAULT_SETTINGS.playerCount, DEFAULT_SETTINGS.startingLife);

const createPlayers = (count: number, startingLife: number): Player[] => {
  // First pass: generate all IDs
  const playerIds = Array.from({ length: count }, () => generateId());

  // Second pass: create players with commander damage tracking
  return playerIds.map((id, index) => {
    const colorPreset = getColorPreset(index);
    const commanderDamage: CommanderDamageState = {};

    // Track damage FROM each other player
    playerIds.forEach(otherId => {
      if (otherId !== id) {
        commanderDamage[otherId] = 0;
      }
    });

    return {
      id,
      name: `Player ${index + 1}`,
      theme: {
        primaryColor: '#ffffff',
        backgroundColor: colorPreset,
      },
      counters: getDefaultCounters(startingLife),
      commanderDamage,
      activeCounterIndex: 0,
      enabledSecondaryCounters: [],
    };
  });
};

// Extended store interface with applyGameAction and commander attack mode
interface ExtendedGameStore extends GameStore {
  applyGameAction: (action: GameAction) => void;
  commanderAttackMode: CommanderAttackModeState;
  enterCommanderAttackMode: (playerId: string, rotation: number) => void;
  exitCommanderAttackMode: () => void;
  highrollMode: HighrollModeState;
  startHighroll: () => void;
  endHighroll: () => void;
  currentSessionId: string | null;
  setCurrentSessionId: (sessionId: string | null) => void;
  restoreState: (state: { players: Player[]; settings: GameSettings }, sessionId?: string) => void;
}

export const useGameStore = create<ExtendedGameStore>()((set, get) => ({
      // Initial State
      players: createPlayers(DEFAULT_SETTINGS.playerCount, DEFAULT_SETTINGS.startingLife),
      settings: DEFAULT_SETTINGS,
      gameMode: 'menu' as GameMode,
      commanderAttackMode: { isActive: false, attackingPlayerId: null, attackerRotation: 0 },
      highrollMode: { isActive: false, results: {}, startTimestamp: null },
      currentSessionId: null,

      // Apply a game action (used by host when receiving from clients, or locally)
      applyGameAction: (action: GameAction) => {
        const { settings } = get();

        switch (action.type) {
          case 'UPDATE_COUNTER':
            set(state => ({
              players: state.players.map(player => {
                if (player.id !== action.playerId) return player;
                return {
                  ...player,
                  counters: player.counters.map(counter => {
                    if (counter.type !== action.counterType) return counter;
                    return { ...counter, value: counter.value + action.delta };
                  }),
                };
              }),
            }));
            break;

          case 'SET_COUNTER':
            set(state => ({
              players: state.players.map(player => {
                if (player.id !== action.playerId) return player;
                return {
                  ...player,
                  counters: player.counters.map(counter => {
                    if (counter.type !== action.counterType) return counter;
                    return { ...counter, value: action.value };
                  }),
                };
              }),
            }));
            break;

          case 'UPDATE_COMMANDER_DAMAGE':
            set(state => ({
              players: state.players.map(player => {
                if (player.id !== action.targetPlayerId) return player;
                const currentDamage = player.commanderDamage[action.sourcePlayerId] || 0;
                return {
                  ...player,
                  commanderDamage: {
                    ...player.commanderDamage,
                    [action.sourcePlayerId]: Math.max(0, currentDamage + action.delta),
                  },
                };
              }),
            }));
            break;

          case 'SET_PLAYER_NAME':
            set(state => ({
              players: state.players.map(player =>
                player.id === action.playerId ? { ...player, name: action.name } : player
              ),
            }));
            break;

          case 'SET_PLAYER_THEME':
            set(state => ({
              players: state.players.map(player =>
                player.id === action.playerId
                  ? { ...player, theme: { ...player.theme, ...action.theme } }
                  : player
              ),
            }));
            break;

          case 'RESET_COUNTERS':
            set(state => ({
              players: state.players.map(player => ({
                ...player,
                counters: getDefaultCounters(settings.startingLife),
                commanderDamage: Object.fromEntries(
                  Object.keys(player.commanderDamage).map(key => [key, 0])
                ),
                activeCounterIndex: 0,
                enabledSecondaryCounters: [],
              })),
            }));
            break;

          case 'SET_PLAYER_COUNT':
            {
              const clampedCount = Math.min(6, Math.max(1, action.count));
              const newPlayers = createPlayers(clampedCount, settings.startingLife);
              set({
                players: newPlayers,
                settings: { ...settings, playerCount: clampedCount },
              });
            }
            break;

          case 'TOGGLE_SECONDARY_COUNTER':
            set(state => ({
              players: state.players.map(player => {
                if (player.id !== action.playerId) return player;
                const enabledSecondaryCounters = action.enabled
                  ? [...player.enabledSecondaryCounters, action.counterType]
                  : player.enabledSecondaryCounters.filter(t => t !== action.counterType);
                return { ...player, enabledSecondaryCounters };
              }),
            }));
            break;

          case 'START_HIGHROLL':
            set({
              highrollMode: {
                isActive: true,
                results: action.results,
                startTimestamp: Date.now(),
              },
              // Exit commander attack mode if active
              commanderAttackMode: { isActive: false, attackingPlayerId: null, attackerRotation: 0 },
            });
            break;

          case 'END_HIGHROLL':
            set({
              highrollMode: { isActive: false, results: {}, startTimestamp: null },
            });
            break;
        }

        // If we're the host in multiplayer, broadcast the updated state
        if (isMultiplayer() && isHost()) {
          broadcastState();
        }
      },

      // Actions
      setPlayerCount: (count: number) => {
        const { settings, gameMode, currentSessionId } = get();
        const clampedCount = Math.min(6, Math.max(1, count));

        // Apply locally
        const newPlayers = createPlayers(clampedCount, settings.startingLife);
        const newSettings = { ...settings, playerCount: clampedCount };
        set({
          players: newPlayers,
          settings: newSettings,
          commanderAttackMode: { isActive: false, attackingPlayerId: null, attackerRotation: 0 },
        });

        // In multiplayer, broadcast to others
        if (isMultiplayer()) {
          sendAction({ type: 'SET_PLAYER_COUNT', count: clampedCount });
        }

        // In local mode with a session, save to localStorage
        if (gameMode === 'local' && currentSessionId) {
          saveSessionToStorage(currentSessionId, newPlayers, newSettings);
        }
      },

      updateCounter: (playerId: string, counterType: CounterType, delta: number) => {
        // Optimistic local update
        set(state => ({
          players: state.players.map(player => {
            if (player.id !== playerId) return player;
            return {
              ...player,
              counters: player.counters.map(counter => {
                if (counter.type !== counterType) return counter;
                return { ...counter, value: counter.value + delta };
              }),
            };
          }),
        }));

        // Send action if multiplayer, save to localStorage if local
        if (isMultiplayer()) {
          sendAction({ type: 'UPDATE_COUNTER', playerId, counterType, delta });
        } else {
          saveCurrentState(get);
        }
      },

      setCounter: (playerId: string, counterType: CounterType, value: number) => {
        set(state => ({
          players: state.players.map(player => {
            if (player.id !== playerId) return player;
            return {
              ...player,
              counters: player.counters.map(counter => {
                if (counter.type !== counterType) return counter;
                return { ...counter, value };
              }),
            };
          }),
        }));

        if (isMultiplayer()) {
          sendAction({ type: 'SET_COUNTER', playerId, counterType, value });
        } else {
          saveCurrentState(get);
        }
      },

      updateCommanderDamage: (targetPlayerId: string, sourcePlayerId: string, delta: number) => {
        set(state => ({
          players: state.players.map(player => {
            if (player.id !== targetPlayerId) return player;
            const currentDamage = player.commanderDamage[sourcePlayerId] || 0;
            return {
              ...player,
              commanderDamage: {
                ...player.commanderDamage,
                [sourcePlayerId]: Math.max(0, currentDamage + delta),
              },
            };
          }),
        }));

        if (isMultiplayer()) {
          sendAction({ type: 'UPDATE_COMMANDER_DAMAGE', targetPlayerId, sourcePlayerId, delta });
        } else {
          saveCurrentState(get);
        }
      },

      setPlayerName: (playerId: string, name: string) => {
        set(state => ({
          players: state.players.map(player =>
            player.id === playerId ? { ...player, name } : player
          ),
        }));

        if (isMultiplayer()) {
          sendAction({ type: 'SET_PLAYER_NAME', playerId, name });
        } else {
          saveCurrentState(get);
        }
      },

      setPlayerTheme: (playerId: string, theme: Partial<PlayerTheme>) => {
        set(state => ({
          players: state.players.map(player =>
            player.id === playerId
              ? { ...player, theme: { ...player.theme, ...theme } }
              : player
          ),
        }));

        if (isMultiplayer()) {
          sendAction({ type: 'SET_PLAYER_THEME', playerId, theme });
        } else {
          saveCurrentState(get);
        }
      },

      setActiveCounter: (playerId: string, index: number) => {
        // This is purely local - each client can view different counters independently
        set(state => ({
          players: state.players.map(player =>
            player.id === playerId ? { ...player, activeCounterIndex: index } : player
          ),
        }));
      },

      toggleSecondaryCounter: (playerId: string, counterType: CounterType, enabled: boolean) => {
        set(state => ({
          players: state.players.map(player => {
            if (player.id !== playerId) return player;
            const enabledSecondaryCounters = enabled
              ? [...player.enabledSecondaryCounters, counterType]
              : player.enabledSecondaryCounters.filter(t => t !== counterType);
            return { ...player, enabledSecondaryCounters };
          }),
        }));

        if (isMultiplayer()) {
          sendAction({ type: 'TOGGLE_SECONDARY_COUNTER', playerId, counterType, enabled });
        } else {
          saveCurrentState(get);
        }
      },

      updateSettings: (newSettings: Partial<GameSettings>) => {
        set(state => ({
          settings: { ...state.settings, ...newSettings },
        }));
      },

      resetGame: () => {
        set({
          players: createPlayers(DEFAULT_SETTINGS.playerCount, DEFAULT_SETTINGS.startingLife),
          settings: DEFAULT_SETTINGS,
          commanderAttackMode: { isActive: false, attackingPlayerId: null, attackerRotation: 0 },
        });
      },

      resetCounters: () => {
        const { settings } = get();
        set(state => ({
          players: state.players.map(player => ({
            ...player,
            counters: getDefaultCounters(settings.startingLife),
            commanderDamage: Object.fromEntries(
              Object.keys(player.commanderDamage).map(key => [key, 0])
            ),
            activeCounterIndex: 0,
            enabledSecondaryCounters: [],
          })),
          commanderAttackMode: { isActive: false, attackingPlayerId: null, attackerRotation: 0 },
        }));

        if (isMultiplayer()) {
          sendAction({ type: 'RESET_COUNTERS' });
        } else {
          saveCurrentState(get);
        }
      },

      // Game mode
      setGameMode: (mode: GameMode) => {
        set({ gameMode: mode });
      },

      // Commander attack mode
      enterCommanderAttackMode: (playerId: string, rotation: number) => {
        set({ commanderAttackMode: { isActive: true, attackingPlayerId: playerId, attackerRotation: rotation } });
      },

      exitCommanderAttackMode: () => {
        set({ commanderAttackMode: { isActive: false, attackingPlayerId: null, attackerRotation: 0 } });
      },

      // Highroll mode
      startHighroll: () => {
        const { players, commanderAttackMode } = get();

        // Exit commander attack mode if active
        if (commanderAttackMode.isActive) {
          set({ commanderAttackMode: { isActive: false, attackingPlayerId: null, attackerRotation: 0 } });
        }

        // Fisher-Yates shuffle to generate unique values 1-6
        const availableValues = [1, 2, 3, 4, 5, 6];
        for (let i = availableValues.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [availableValues[i], availableValues[j]] = [availableValues[j], availableValues[i]];
        }

        // Assign unique values to each player
        const results: Record<string, number> = {};
        players.forEach((player, index) => {
          results[player.id] = availableValues[index];
        });

        set({
          highrollMode: {
            isActive: true,
            results,
            startTimestamp: Date.now(),
          },
        });

        // Send action if multiplayer
        if (isMultiplayer()) {
          sendAction({ type: 'START_HIGHROLL', results });
        }

        // Auto-exit after 5 seconds
        setTimeout(() => {
          get().endHighroll();
        }, 5000);
      },

      endHighroll: () => {
        set({
          highrollMode: { isActive: false, results: {}, startTimestamp: null },
        });

        if (isMultiplayer()) {
          sendAction({ type: 'END_HIGHROLL' });
        }
      },

      // Multiplayer: Apply state received from host
      applyRemoteState: (players: Player[], settings: GameSettings, highrollMode?: HighrollModeState) => {
        const currentPlayers = get().players;
        // Preserve local activeCounterIndex - each client can view counters independently
        const mergedPlayers = players.map((remotePlayer, index) => {
          // Find matching local player by ID first, then by position as fallback
          const localPlayer = currentPlayers.find(p => p.id === remotePlayer.id)
            ?? currentPlayers[index];
          return {
            ...remotePlayer,
            activeCounterIndex: localPlayer?.activeCounterIndex ?? 0,
          };
        });

        const updates: Partial<ExtendedGameStore> = { players: mergedPlayers, settings };

        // Apply highrollMode if provided
        if (highrollMode) {
          updates.highrollMode = highrollMode;
        }

        set(updates);
      },

      // Set current session ID (for tracking which session is being played)
      setCurrentSessionId: (sessionId: string | null) => {
        set({ currentSessionId: sessionId });
      },

      // Restore saved game state (for session resume)
  restoreState: (state: { players: Player[]; settings: GameSettings }, sessionId?: string) => {
    set({
      players: state.players,
      settings: state.settings,
      commanderAttackMode: { isActive: false, attackingPlayerId: null, attackerRotation: 0 },
      highrollMode: { isActive: false, results: {}, startTimestamp: null },
      currentSessionId: sessionId ?? null,
    });
  },
}));
