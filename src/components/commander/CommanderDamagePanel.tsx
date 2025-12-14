import { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords } from 'lucide-react';
import { useLongPress } from '@/hooks/useLongPress';
import { useHaptics } from '@/hooks/useHaptics';
import { useDeltaDisplay } from '@/hooks/useDeltaDisplay';
import { LONG_PRESS_DELAY } from '@/constants';

interface CommanderDamagePanelProps {
  commanderDamage: number;
  color: string;
  backgroundColor: string;
  onDealDamage: (delta: number) => void;
  attackerRotation?: number;
  targetRotation?: number;
  containerWidth?: number;
  containerHeight?: number;
}

export const CommanderDamagePanel = ({
  commanderDamage,
  color,
  backgroundColor,
  onDealDamage,
  attackerRotation = 0,
  targetRotation = 0,
  containerWidth = 0,
  containerHeight = 0,
}: CommanderDamagePanelProps) => {
  // Calculate the rotation needed to display content in attacker's orientation
  const contentRotation = attackerRotation - targetRotation;

  // Normalize rotation to 0-360 range
  const normalizedRotation = ((contentRotation % 360) + 360) % 360;
  const isSideways = normalizedRotation === 90 || normalizedRotation === 270;
  const { lightTap, mediumTap } = useHaptics();
  const { accumulatedDelta, trackDelta } = useDeltaDisplay();

  const handleDamage = useCallback((delta: number, isLongPress: boolean) => {
    if (isLongPress) {
      mediumTap();
    } else {
      lightTap();
    }
    onDealDamage(delta);
    trackDelta(delta);
  }, [onDealDamage, lightTap, mediumTap, trackDelta]);

  const leftHandlers = useLongPress({
    onLongPress: () => handleDamage(-10, true),
    onTap: () => handleDamage(-1, false),
    delay: LONG_PRESS_DELAY,
  });

  const rightHandlers = useLongPress({
    onLongPress: () => handleDamage(10, true),
    onTap: () => handleDamage(1, false),
    delay: LONG_PRESS_DELAY,
  });

  return (
    <div
      className="absolute inset-0 z-20"
      style={{ backgroundColor }}
    >
      {/* Darkening overlay */}
      <div className="absolute inset-0 bg-black/50 pointer-events-none" />

      {/* Counter display */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
      >
        <div
          className="relative flex flex-col items-center justify-center"
          style={{ transform: `rotate(${contentRotation}deg)` }}
        >
          <AnimatePresence>
            {accumulatedDelta !== 0 && (
              <motion.span
                key="delta"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute text-[4vmin] font-thin opacity-60"
                style={{
                  color,
                  top: '-20%',
                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
                }}
              >
                {accumulatedDelta > 0 ? `+${accumulatedDelta}` : accumulatedDelta}
              </motion.span>
            )}
          </AnimatePresence>
          <span
            className="text-[18vmin] leading-none"
            style={{ color, textShadow: '0 4px 8px rgba(0, 0, 0, 0.5)' }}
          >
            {commanderDamage}
          </span>
          <Swords size={24} color={color} />
        </div>
      </div>

      {/* Touch zones - rotated to match attacker's orientation */}
      <div
        className="absolute flex"
        style={
          isSideways && containerWidth && containerHeight
            ? {
                top: '50%',
                left: '50%',
                width: containerHeight,
                height: containerWidth,
                transform: `translate(-50%, -50%) rotate(${contentRotation}deg)`,
              }
            : {
                inset: 0,
                transform: `rotate(${contentRotation}deg)`,
              }
        }
      >
        <div
          className={`flex-1 transition-colors touch-none ${
            commanderDamage > 0
              ? 'cursor-pointer active:bg-white/5'
              : 'cursor-not-allowed opacity-50'
          }`}
          {...(commanderDamage > 0 ? leftHandlers : {})}
        />
        <div className="flex-[2]" />
        <div
          className="flex-1 cursor-pointer active:bg-white/5 transition-colors touch-none"
          {...rightHandlers}
        />
      </div>
    </div>
  );
};
