import { useRef } from 'react';
import { useDrag } from '@use-gesture/react';
import { useMotionValue, animate } from 'framer-motion';
import { useLongPress } from '@/hooks/useLongPress';
import { useHaptics } from '@/hooks/useHaptics';

interface ControlOverlayProps {
  onIncrement: (delta: number) => void;
  rotation?: number;
  isPortrait?: boolean;
  canGoNext: boolean;
  canGoPrev: boolean;
  onSwipeNext: () => void;
  onSwipePrev: () => void;
  onBoundaryHit?: () => void;
  dragOffset: ReturnType<typeof useMotionValue<number>>;
}

const SWIPE_THRESHOLD = 50;

export const ControlOverlay = ({
  onIncrement,
  rotation = 0,
  isPortrait = false,
  canGoNext,
  canGoPrev,
  onSwipeNext,
  onSwipePrev,
  onBoundaryHit,
  dragOffset,
}: ControlOverlayProps) => {
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
    ({ movement: [mx, my], last }) => {
      // Touch coordinates are in screen space. Map them to card-local space.
      // Total rotation = AppLayout rotation (90° if portrait) + card rotation
      const totalRotation = (rotation + (isPortrait ? 90 : 0)) % 360;

      // Map screen movement to card-local horizontal movement
      let cardMovement: number;
      if (totalRotation === 90) {
        cardMovement = my;
      } else if (totalRotation === 270) {
        cardMovement = -my;
      } else if (totalRotation === 180) {
        cardMovement = -mx;
      } else {
        cardMovement = mx;
      }

      const isAtBoundary =
        (cardMovement < 0 && !canGoNext) ||
        (cardMovement > 0 && !canGoPrev);

      if (last) {
        if (cardMovement < -SWIPE_THRESHOLD && canGoNext) {
          onSwipeNext();
        } else if (cardMovement > SWIPE_THRESHOLD && canGoPrev) {
          onSwipePrev();
        } else if (isAtBoundary && Math.abs(cardMovement) > 10) {
          onBoundaryHit?.();
        }
        // Animate back to center
        animate(dragOffset, 0, { type: 'spring', stiffness: 500, damping: 35 });
      } else {
        // Subtle hint - max 15px movement
        const maxOffset = isAtBoundary ? 8 : 15;
        const offset = Math.max(-maxOffset, Math.min(maxOffset, cardMovement * 0.15));
        dragOffset.set(offset);
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
