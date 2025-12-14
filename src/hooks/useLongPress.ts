import { useCallback, useRef } from 'react';

interface LongPressOptions {
  delay?: number;
  onLongPress: () => void;
  onTap?: () => void;
}

export const useLongPress = ({ delay = 400, onLongPress, onTap }: LongPressOptions) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    clearTimer();
    isLongPressRef.current = false;

    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      onLongPress();
    }, delay);
  }, [onLongPress, delay, clearTimer]);

  const end = useCallback(() => {
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
    // Use both touch and mouse events for maximum compatibility
    onTouchStart: start,
    onTouchEnd: end,
    onTouchCancel: cancel,
    onMouseDown: start,
    onMouseUp: end,
    onMouseLeave: cancel,
  };
};
