import { useRef } from 'react';
import { useDrag } from '@use-gesture/react';
import { Swords } from 'lucide-react';
import { useHaptics } from '@/hooks/useHaptics';
import { useRotationTransform } from '@/hooks/useRotationTransform';
import { SWIPE_THRESHOLD } from '@/constants';

interface CommanderAttackIndicatorProps {
  color: string;
  backgroundColor: string;
  onExit: () => void;
  rotation?: number;
  isPortrait?: boolean;
}

export const CommanderAttackIndicator = ({
  color,
  backgroundColor,
  onExit,
  rotation = 0,
  isPortrait = false,
}: CommanderAttackIndicatorProps) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const { mediumTap } = useHaptics();
  const { mapMovementToLocal } = useRotationTransform({ rotation, isPortrait });

  useDrag(
    ({ movement: [mx, my], last }) => {
      const { horizontal } = mapMovementToLocal(mx, my);

      if (last && Math.abs(horizontal) > SWIPE_THRESHOLD) {
        mediumTap();
        onExit();
      }
    },
    { target: overlayRef, filterTaps: true }
  );

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 z-20 flex flex-col items-center justify-center touch-none"
      style={{ backgroundColor }}
    >
      {/* Darkening overlay */}
      <div className="absolute inset-0 bg-black/50 pointer-events-none" />

      {/* Content */}
      <div className="relative flex flex-col items-center justify-center gap-4">
        <Swords size={24} color={color} />
        <span
          className="text-md font-semibold text-center"
          style={{ color, textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)' }}
        >
          Dealing Commander Damage
        </span>

      </div>
    </div>
  );
};
