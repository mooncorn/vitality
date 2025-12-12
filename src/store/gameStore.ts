import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GameStore, Player, CounterType, PlayerTheme, GameSettings, CommanderDamageState, GameMode } from '@/types';
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

const DEFAULT_SETTINGS: GameSettings = {
  startingLife: 40,
  allowSleep: false,
  playerCount: 2,
};

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

// Extended store interface with applyGameAction
interface ExtendedGameStore extends GameStore {
  applyGameAction: (action: GameAction) => void;
}

export const useGameStore = create<ExtendedGameStore>()(
  persist(
    (set, get) => ({
      // Initial State
      players: createPlayers(DEFAULT_SETTINGS.playerCount, DEFAULT_SETTINGS.startingLife),
      settings: DEFAULT_SETTINGS,
      gameMode: 'menu' as GameMode,

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
        }

        // If we're the host in multiplayer, broadcast the updated state
        if (isMultiplayer() && isHost()) {
          broadcastState();
        }
      },

      // Actions
      setPlayerCount: (count: number) => {
        const { settings } = get();
        const clampedCount = Math.min(6, Math.max(1, count));

        // Apply locally
        const newPlayers = createPlayers(clampedCount, settings.startingLife);
        set({
          players: newPlayers,
          settings: { ...settings, playerCount: clampedCount },
        });

        // In multiplayer, broadcast to others
        if (isMultiplayer()) {
          sendAction({ type: 'SET_PLAYER_COUNT', count: clampedCount });
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

        // Send action if multiplayer
        if (isMultiplayer()) {
          sendAction({ type: 'UPDATE_COUNTER', playerId, counterType, delta });
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
        }
      },

      updateSettings: (newSettings: Partial<GameSettings>) => {
        set(state => ({
          settings: { ...state.settings, ...newSettings },
        }));
      },

      resetGame: () => {
        const { settings } = get();
        set({
          players: createPlayers(settings.playerCount, settings.startingLife),
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
        }));

        if (isMultiplayer()) {
          sendAction({ type: 'RESET_COUNTERS' });
        }
      },

      // Game mode
      setGameMode: (mode: GameMode) => {
        set({ gameMode: mode });
      },

      // Multiplayer: Apply state received from host
      applyRemoteState: (players: Player[], settings: GameSettings) => {
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
        set({ players: mergedPlayers, settings });
      },
    }),
    {
      name: 'vitality-game-state',
      version: 1,
      partialize: (state) => ({
        players: state.players,
        settings: state.settings,
        // Don't persist gameMode - always start on menu
      }),
    }
  )
);
