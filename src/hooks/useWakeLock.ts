import { useEffect, useRef } from 'react';

export const useWakeLock = (enabled: boolean) => {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) {
      return;
    }

    const requestWakeLock = async () => {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      } catch (err) {
        console.error('Wake Lock error:', err);
      }
    };

    requestWakeLock();

    // Re-acquire wake lock when page becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && enabled) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      wakeLockRef.current?.release();
      wakeLockRef.current = null;
    };
  }, [enabled]);
};
