import { useMemo, useCallback } from 'react';

interface UseRotationTransformOptions {
  rotation?: number;
  isPortrait?: boolean;
}

interface UseRotationTransformReturn {
  totalRotation: number;
  mapMovementToLocal: (mx: number, my: number) => { vertical: number; horizontal: number };
  getContentRotation: (attackerRotation: number) => number;
}

export const useRotationTransform = (
  options: UseRotationTransformOptions = {}
): UseRotationTransformReturn => {
  const { rotation = 0, isPortrait = false } = options;

  // Total rotation = AppLayout rotation (90deg if portrait) + card rotation
  const totalRotation = useMemo(
    () => (rotation + (isPortrait ? 90 : 0)) % 360,
    [rotation, isPortrait]
  );

  // Map screen movement to card-local vertical and horizontal movement
  const mapMovementToLocal = useCallback(
    (mx: number, my: number) => {
      let vertical: number;
      let horizontal: number;

      if (totalRotation === 90) {
        vertical = -mx;
        horizontal = my;
      } else if (totalRotation === 270) {
        vertical = mx;
        horizontal = -my;
      } else if (totalRotation === 180) {
        vertical = -my;
        horizontal = -mx;
      } else {
        vertical = my;
        horizontal = mx;
      }

      return { vertical, horizontal };
    },
    [totalRotation]
  );

  // Calculate rotation for content to display in attacker's orientation
  const getContentRotation = useCallback(
    (attackerRotation: number) => attackerRotation - rotation,
    [rotation]
  );

  return {
    totalRotation,
    mapMovementToLocal,
    getContentRotation,
  };
};
