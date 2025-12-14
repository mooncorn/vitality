import { useCallback, useRef } from 'react';

interface LongPressOptions {
  delay?: number;
  onLongPress: () => void;
  onTap?: () => void;
}

export const useLongPress = ({ delay = 400, onLongPress, onTap }: LongPressOptions) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);
  const isTouchRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = useCallback((isTouch: boolean) => {
    // If this is a mouse event but we just had a touch, ignore it (prevents double-fire)
    if (!isTouch && isTouchRef.current) return;

    isTouchRef.current = isTouch;
    clearTimer();
    isLongPressRef.current = false;

    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      onLongPress();
    }, delay);
  }, [onLongPress, delay, clearTimer]);

  const end = useCallback((isTouch: boolean) => {
    // If this is a mouse event but we started with touch, ignore it
    if (!isTouch && isTouchRef.current) {
      // Reset touch flag after a short delay to allow future mouse events
      setTimeout(() => { isTouchRef.current = false; }, 100);
      return;
    }

    const wasLongPress = isLongPressRef.current;
    clearTimer();
    isLongPressRef.current = false;

    // Fire tap if it wasn't a long press
    if (!wasLongPress && onTap) {
      onTap();
    }
  }, [onTap, clearTimer]);

  const cancel = useCallback(() => {
    clearTimer();
    isLongPressRef.current = false;
  }, [clearTimer]);

  return {
    onTouchStart: () => start(true),
    onTouchEnd: () => end(true),
    onTouchCancel: cancel,
    onMouseDown: () => start(false),
    onMouseUp: () => end(false),
    onMouseLeave: cancel,
  };
};
