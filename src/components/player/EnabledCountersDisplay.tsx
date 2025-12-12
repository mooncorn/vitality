import { Shield, Zap, Sparkle } from 'lucide-react';
import type { Player, CounterType } from '@/types';

interface EnabledCountersDisplayProps {
  player: Player;
  selectedCounter: CounterType | null;
  onSelectCounter: (counterType: CounterType | null) => void;
  isSideways: boolean;
}

const iconMap: Record<string, typeof Shield> = {
  poison: Shield,
  energy: Zap,
  experience: Sparkle,
};

export const EnabledCountersDisplay = ({
  player,
  selectedCounter,
  onSelectCounter,
  isSideways,
}: EnabledCountersDisplayProps) => {
  const enabledCounters = player.enabledSecondaryCounters;

  if (enabledCounters.length === 0) return null;

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 flex gap-2 z-20 max-w-[90%] overflow-x-auto scrollbar-hide px-2 py-2"
      style={{
        bottom: isSideways ? '4px' : '12px',
      }}
    >
      {enabledCounters.map(counterType => {
        const counter = player.counters.find(c => c.type === counterType);
        const Icon = iconMap[counterType];
        if (!counter || !Icon) return null;

        const isSelected = selectedCounter === counterType;

        return (
          <button
            key={counterType}
            onClick={() => onSelectCounter(isSelected ? null : counterType)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all shrink-0 ${
              isSelected
                ? 'bg-white/30 border-2 border-white/60 scale-110'
                : 'bg-black/30 backdrop-blur-sm border border-transparent hover:bg-black/40'
            }`}
            style={{ color: player.theme.primaryColor }}
          >
            <Icon size={14} />
            <span className="text-sm font-bold tabular-nums">{counter.value}</span>
          </button>
        );
      })}
    </div>
  );
};
