import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords } from 'lucide-react';
import { useLongPress } from '@/hooks/useLongPress';
import { useHaptics } from '@/hooks/useHaptics';

const DELTA_RESET_DELAY = 1500;

interface CommanderTargetOverlayProps {
  commanderDamage: number;
  color: string;
  backgroundColor: string;
  onDealDamage: (delta: number) => void;
  attackerRotation?: number;
  targetRotation?: number;
}

export const CommanderTargetOverlay = ({
  commanderDamage,
  color,
  backgroundColor,
  onDealDamage,
  attackerRotation = 0,
  targetRotation = 0,
}: CommanderTargetOverlayProps) => {
  // Calculate the rotation needed to display content in attacker's orientation
  // We need to counteract the target's rotation and apply the attacker's rotation
  const contentRotation = attackerRotation - targetRotation;
  const { lightTap, mediumTap } = useHaptics();

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

  const handleDamage = useCallback((delta: number, isLongPress: boolean) => {
    if (isLongPress) {
      mediumTap();
    } else {
      lightTap();
    }
    onDealDamage(delta);

    // Accumulate delta for display
    setAccumulatedDelta(prev => prev + delta);

    // Reset timeout
    if (deltaTimeoutRef.current) {
      clearTimeout(deltaTimeoutRef.current);
    }
    deltaTimeoutRef.current = setTimeout(() => {
      setAccumulatedDelta(0);
    }, DELTA_RESET_DELAY);
  }, [onDealDamage, lightTap, mediumTap]);

  const leftHandlers = useLongPress({
    onLongPress: () => handleDamage(-10, true),
    onTap: () => handleDamage(-1, false),
    delay: 400,
  });

  const rightHandlers = useLongPress({
    onLongPress: () => handleDamage(10, true),
    onTap: () => handleDamage(1, false),
    delay: 400,
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
        className="absolute inset-0 flex"
        style={{ transform: `rotate(${contentRotation}deg)` }}
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
