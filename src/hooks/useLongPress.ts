import { useCallback, useRef } from 'react';

interface LongPressOptions {
  delay?: number;
  onLongPress: () => void;
  onTap?: () => void;
}

export const useLongPress = ({ delay = 400, onLongPress, onTap }: LongPressOptions) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);
  const isActiveRef = useRef(false);

  const start = useCallback(() => {
    isActiveRef.current = true;
    isLongPressRef.current = false;

    timerRef.current = setTimeout(() => {
      if (isActiveRef.current) {
        isLongPressRef.current = true;
        onLongPress();
      }
    }, delay);
  }, [onLongPress, delay]);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (isActiveRef.current && !isLongPressRef.current && onTap) {
      onTap();
    }

    isActiveRef.current = false;
  }, [onTap]);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    isActiveRef.current = false;
  }, []);

  return {
    onPointerDown: start,
    onPointerUp: stop,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
  };
};
