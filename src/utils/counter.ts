import type { CounterState, CounterType } from '@/types';
import { generateId } from './id';

export const getDefaultCounters = (startingLife: number): CounterState[] => [
  { id: generateId(), type: 'life', value: startingLife, icon: 'Heart' },
  { id: generateId(), type: 'poison', value: 0, icon: 'Skull' },
  { id: generateId(), type: 'energy', value: 0, icon: 'Zap' },
  { id: generateId(), type: 'experience', value: 0, icon: 'Star' },
  { id: generateId(), type: 'radiation', value: 0, icon: 'Radiation' },
];

export const getCounterIcon = (type: CounterType): string => {
  const icons: Record<CounterType, string> = {
    life: 'Heart',
    poison: 'Skull',
    energy: 'Zap',
    commander: 'Shield',
    experience: 'Star',
    radiation: 'Radiation',
  };
  return icons[type];
};

export const getCounterLabel = (type: CounterType): string => {
  const labels: Record<CounterType, string> = {
    life: 'Life',
    poison: 'Poison',
    energy: 'Energy',
    commander: 'Commander',
    experience: 'Experience',
    radiation: 'Radiation',
  };
  return labels[type];
};
