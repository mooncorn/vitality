import { useCallback } from 'react';

export const useHaptics = () => {
  const vibrate = useCallback((pattern: number | number[] = 10) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }, []);

  const lightTap = useCallback(() => {
    vibrate(10);
  }, [vibrate]);

  const mediumTap = useCallback(() => {
    vibrate(25);
  }, [vibrate]);

  const heavyTap = useCallback(() => {
    vibrate(50);
  }, [vibrate]);

  return { vibrate, lightTap, mediumTap, heavyTap };
};
