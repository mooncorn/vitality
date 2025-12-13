import { useRef } from 'react';
import { useDrag } from '@use-gesture/react';
import { useLongPress } from '@/hooks/useLongPress';
import { useHaptics } from '@/hooks/useHaptics';

interface ControlOverlayProps {
  onIncrement: (delta: number) => void;
  rotation?: number;
  isPortrait?: boolean;
  onVerticalSwipeUp?: () => void;
  onVerticalSwipeDown?: () => void;
  onHorizontalSwipe?: () => void;
  disabled?: boolean;
}

const SWIPE_THRESHOLD = 50;

export const ControlOverlay = ({
  onIncrement,
  rotation = 0,
  isPortrait = false,
  onVerticalSwipeUp,
  onVerticalSwipeDown,
  onHorizontalSwipe,
  disabled = false,
}: ControlOverlayProps) => {
  const { lightTap, mediumTap } = useHaptics();
  const centerRef = useRef<HTMLDivElement>(null);

  const handleTap = (delta: number) => {
    if (disabled) return;
    lightTap();
    onIncrement(delta);
  };

  const handleLongPress = (delta: number) => {
    if (disabled) return;
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
    ({ movement: [mx, my], last }) => {
      if (disabled) return;

      // Touch coordinates are in screen space. Map them to card-local space.
      // Total rotation = AppLayout rotation (90° if portrait) + card rotation
      const totalRotation = (rotation + (isPortrait ? 90 : 0)) % 360;

      // Map screen movement to card-local vertical and horizontal movement
      let cardVertical: number;
      let cardHorizontal: number;
      if (totalRotation === 90) {
        cardVertical = -mx;
        cardHorizontal = my;
      } else if (totalRotation === 270) {
        cardVertical = mx;
        cardHorizontal = -my;
      } else if (totalRotation === 180) {
        cardVertical = -my;
        cardHorizontal = -mx;
      } else {
        cardVertical = my;
        cardHorizontal = mx;
      }

      if (last) {
        // Swipe up (negative vertical movement) opens the counter toggle overlay
        if (cardVertical < -SWIPE_THRESHOLD) {
          onVerticalSwipeUp?.();
        }
        // Swipe down (positive vertical movement) opens the settings overlay
        else if (cardVertical > SWIPE_THRESHOLD) {
          onVerticalSwipeDown?.();
        }
        // Horizontal swipe (left or right) toggles commander attack mode
        else if (Math.abs(cardHorizontal) > SWIPE_THRESHOLD) {
          onHorizontalSwipe?.();
        }
      }
    },
    { target: centerRef, filterTaps: true }
  );

  return (
    <div className="absolute inset-0 flex z-10">
      <div
        className="flex-1 cursor-pointer active:bg-white/5 transition-colors"
        {...leftHandlers}
      />
      <div ref={centerRef} className="flex-[2] touch-none" />
      <div
        className="flex-1 cursor-pointer active:bg-white/5 transition-colors"
        {...rightHandlers}
      />
    </div>
  );
};
