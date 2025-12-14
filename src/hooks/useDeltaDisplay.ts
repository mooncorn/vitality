import { useState, useRef, useEffect, useCallback } from 'react';
import { DELTA_RESET_DELAY } from '@/constants';

interface UseDeltaDisplayOptions {
  resetDelay?: number;
  onReset?: () => void;
}

interface UseDeltaDisplayReturn {
  accumulatedDelta: number;
  trackDelta: (delta: number) => void;
  resetDelta: () => void;
}

export const useDeltaDisplay = (
  options: UseDeltaDisplayOptions = {}
): UseDeltaDisplayReturn => {
  const { resetDelay = DELTA_RESET_DELAY, onReset } = options;

  const [accumulatedDelta, setAccumulatedDelta] = useState(0);
  const deltaTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (deltaTimeoutRef.current) {
        clearTimeout(deltaTimeoutRef.current);
      }
    };
  }, []);

  const trackDelta = useCallback(
    (delta: number) => {
      setAccumulatedDelta(prev => prev + delta);

      // Reset timeout
      if (deltaTimeoutRef.current) {
        clearTimeout(deltaTimeoutRef.current);
      }

      deltaTimeoutRef.current = setTimeout(() => {
        setAccumulatedDelta(0);
        onReset?.();
      }, resetDelay);
    },
    [resetDelay, onReset]
  );

  const resetDelta = useCallback(() => {
    if (deltaTimeoutRef.current) {
      clearTimeout(deltaTimeoutRef.current);
    }
    setAccumulatedDelta(0);
  }, []);

  return {
    accumulatedDelta,
    trackDelta,
    resetDelta,
  };
};
