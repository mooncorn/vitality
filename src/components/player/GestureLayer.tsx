import { useRef, useCallback } from 'react';
import { useLongPress } from '@/hooks/useLongPress';
import { useHaptics } from '@/hooks/useHaptics';

interface GestureLayerProps {
  onIncrement: (delta: number) => void;
  rotation?: number;
  isPortrait?: boolean;
  onVerticalSwipeUp?: () => void;
  onVerticalSwipeDown?: () => void;
  onHorizontalSwipe?: () => void;
  disabled?: boolean;
}

const SWIPE_THRESHOLD = 50;

export const GestureLayer = ({
  onIncrement,
  rotation = 0,
  isPortrait = false,
  onVerticalSwipeUp,
  onVerticalSwipeDown,
  onHorizontalSwipe,
  disabled = false,
}: GestureLayerProps) => {
  const { lightTap, mediumTap } = useHaptics();
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

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

  // Process swipe based on delta
  const processSwipe = useCallback((deltaX: number, deltaY: number) => {
    // Map screen movement to card-local space based on rotation
    const totalRotation = (rotation + (isPortrait ? 90 : 0)) % 360;

    let cardVertical: number;
    let cardHorizontal: number;
    if (totalRotation === 90) {
      cardVertical = -deltaX;
      cardHorizontal = deltaY;
    } else if (totalRotation === 270) {
      cardVertical = deltaX;
      cardHorizontal = -deltaY;
    } else if (totalRotation === 180) {
      cardVertical = -deltaY;
      cardHorizontal = -deltaX;
    } else {
      cardVertical = deltaY;
      cardHorizontal = deltaX;
    }

    // Swipe up opens counter toggle overlay
    if (cardVertical < -SWIPE_THRESHOLD) {
      onVerticalSwipeUp?.();
    }
    // Swipe down opens settings overlay
    else if (cardVertical > SWIPE_THRESHOLD) {
      onVerticalSwipeDown?.();
    }
    // Horizontal swipe toggles commander attack mode
    else if (Math.abs(cardHorizontal) > SWIPE_THRESHOLD) {
      onHorizontalSwipe?.();
    }
  }, [rotation, isPortrait, onVerticalSwipeUp, onVerticalSwipeDown, onHorizontalSwipe]);

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, [disabled]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (disabled || !touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    touchStartRef.current = null;
    processSwipe(deltaX, deltaY);
  }, [disabled, processSwipe]);

  // Mouse handlers for desktop
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled) return;
    touchStartRef.current = { x: e.clientX, y: e.clientY };
  }, [disabled]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (disabled || !touchStartRef.current) return;
    const deltaX = e.clientX - touchStartRef.current.x;
    const deltaY = e.clientY - touchStartRef.current.y;
    touchStartRef.current = null;
    processSwipe(deltaX, deltaY);
  }, [disabled, processSwipe]);

  return (
    <div className="absolute inset-0 flex z-10">
      <div
        className="flex-1 cursor-pointer active:bg-white/5 transition-colors touch-manipulation"
        {...leftHandlers}
      />
      <div
        className="flex-[2]"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      />
      <div
        className="flex-1 cursor-pointer active:bg-white/5 transition-colors touch-manipulation"
        {...rightHandlers}
      />
    </div>
  );
};
