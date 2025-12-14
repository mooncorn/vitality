import type { Player, CounterType } from '@/types';
import { CustomIcon } from '@/components/ui/CustomIcon';
import { COUNTER_ICON_CONFIG } from '@/constants/counters';

interface SecondaryCounterBarProps {
  player: Player;
  selectedCounter: CounterType | null;
  onSelectCounter: (counterType: CounterType | null) => void;
  isSideways: boolean;
}

export const SecondaryCounterBar = ({
  player,
  selectedCounter,
  onSelectCounter,
  isSideways,
}: SecondaryCounterBarProps) => {
  const enabledCounters = player.enabledSecondaryCounters;

  if (enabledCounters.length === 0) return null;

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 flex gap-1.5 z-20 max-w-[90%] overflow-x-auto scrollbar-hide px-1 py-1"
      style={{
        bottom: isSideways ? '2px' : '4px',
      }}
    >
      {enabledCounters.map(counterType => {
        const counter = player.counters.find(c => c.type === counterType);
        const config = COUNTER_ICON_CONFIG[counterType];
        if (!counter || !config) return null;

        const isSelected = selectedCounter === counterType;

        return (
          <button
            key={counterType}
            onClick={() => onSelectCounter(isSelected ? null : counterType)}
            className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all shrink-0 ${
              isSelected
                ? 'bg-white/30 border-2 border-white/60 scale-110'
                : 'bg-black/30 backdrop-blur-sm border border-transparent hover:bg-black/40'
            }`}
            style={{ color: player.theme.primaryColor }}
          >
            <CustomIcon config={config} size={12} color={player.theme.primaryColor} />
            <span className="text-xs font-bold tabular-nums">{counter.value}</span>
          </button>
        );
      })}
    </div>
  );
};
