import { useState, useEffect } from 'react';

export const useIsMobile = (): boolean => {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 768px)').matches ||
           'ontouchstart' in window ||
           navigator.maxTouchPoints > 0;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)');

    const handleChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches || 'ontouchstart' in window || navigator.maxTouchPoints > 0);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isMobile;
};
