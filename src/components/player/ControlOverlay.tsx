import { useRef } from 'react';
import { useDrag } from '@use-gesture/react';
import { useLongPress } from '@/hooks/useLongPress';
import { useHaptics } from '@/hooks/useHaptics';

interface ControlOverlayProps {
  onIncrement: (delta: number) => void;
  onSwipe?: (direction: 'left' | 'right') => void;
}

const SWIPE_THRESHOLD = 50;

export const ControlOverlay = ({ onIncrement, onSwipe }: ControlOverlayProps) => {
  const { lightTap, mediumTap } = useHaptics();
  const centerRef = useRef<HTMLDivElement>(null);

  const handleTap = (delta: number) => {
    lightTap();
    onIncrement(delta);
  };

  const handleLongPress = (delta: number) => {
    mediumTap();
    onIncrement(delta);
  };

  const leftHandlers = useLongPress({
    onLongPress: () => handleLongPress(-10),
    onTap: () => handleTap(-1),
    delay: 400,
  });

  const rightHandlers = useLongPress({
    onLongPress: () => handleLongPress(10),
    onTap: () => handleTap(1),
    delay: 400,
  });

  useDrag(
    ({ movement: [mx], last }) => {
      if (last && onSwipe) {
        if (mx < -SWIPE_THRESHOLD) {
          onSwipe('left');
        } else if (mx > SWIPE_THRESHOLD) {
          onSwipe('right');
        }
      }
    },
    { target: centerRef, axis: 'x', filterTaps: true }
  );

  return (
    <div className="absolute inset-0 flex z-10">
      <div
        className="flex-1 cursor-pointer active:bg-white/5 transition-colors"
        {...leftHandlers}
      />
      <div ref={centerRef} className="flex-1 touch-none" />
      <div
        className="flex-1 cursor-pointer active:bg-white/5 transition-colors"
        {...rightHandlers}
      />
    </div>
  );
};
