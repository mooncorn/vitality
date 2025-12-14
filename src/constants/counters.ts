import { Heart, Swords } from 'lucide-react';
import type { CounterType } from '@/types';
import type { IconConfig } from '@/components/ui/CustomIcon';

// Single source of truth for counter icons
export const COUNTER_ICON_CONFIG: Record<CounterType, IconConfig> = {
  life: { icon: Heart },
  poison: { className: 'ms ms-h' },
  energy: { className: 'ms ms-e' },
  commander: { icon: Swords },
  experience: { text: 'XP' },
  radiation: { className: 'ms ms-counter-rad' },
};

// Secondary counters that can be enabled/disabled
export const SECONDARY_COUNTERS: { type: CounterType; label: string }[] = [
  { type: 'poison', label: 'Poison' },
  { type: 'energy', label: 'Energy' },
  { type: 'experience', label: 'Experience' },
  { type: 'radiation', label: 'Radiation' },
];
