import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GameStore, Player, CounterType, PlayerTheme, GameSettings, CommanderDamageState } from '@/types';
import { generateId } from '@/utils/id';
import { getDefaultCounters } from '@/utils/counter';
import { getColorPreset } from '@/utils/colors';

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
    };
  });
};

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      // Initial State
      players: createPlayers(DEFAULT_SETTINGS.playerCount, DEFAULT_SETTINGS.startingLife),
      settings: DEFAULT_SETTINGS,

      // Actions
      setPlayerCount: (count: number) => {
        const { settings } = get();
        const clampedCount = Math.min(6, Math.max(1, count));
        const newPlayers = createPlayers(clampedCount, settings.startingLife);
        set({
          players: newPlayers,
          settings: { ...settings, playerCount: clampedCount },
        });
      },

      updateCounter: (playerId: string, counterType: CounterType, delta: number) => {
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
      },

      setCommanderDamage: (targetPlayerId: string, sourcePlayerId: string, value: number) => {
        set(state => ({
          players: state.players.map(player => {
            if (player.id !== targetPlayerId) return player;
            return {
              ...player,
              commanderDamage: {
                ...player.commanderDamage,
                [sourcePlayerId]: Math.max(0, value),
              },
            };
          }),
        }));
      },

      setPlayerName: (playerId: string, name: string) => {
        set(state => ({
          players: state.players.map(player =>
            player.id === playerId ? { ...player, name } : player
          ),
        }));
      },

      setPlayerTheme: (playerId: string, theme: Partial<PlayerTheme>) => {
        set(state => ({
          players: state.players.map(player =>
            player.id === playerId
              ? { ...player, theme: { ...player.theme, ...theme } }
              : player
          ),
        }));
      },

      setActiveCounter: (playerId: string, index: number) => {
        set(state => ({
          players: state.players.map(player =>
            player.id === playerId ? { ...player, activeCounterIndex: index } : player
          ),
        }));
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
          })),
        }));
      },
    }),
    {
      name: 'vitality-game-state',
      version: 1,
    }
  )
);
