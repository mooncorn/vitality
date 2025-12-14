import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6 } from 'lucide-react';
import { useRotationTransform } from '@/hooks/useRotationTransform';

const DiceIcons = {
  1: Dice1,
  2: Dice2,
  3: Dice3,
  4: Dice4,
  5: Dice5,
  6: Dice6,
} as const;

interface DiceRollDisplayProps {
  diceValue: number;
  color: string;
  backgroundColor: string;
  rotation?: number;
  isPortrait?: boolean;
  isWinner?: boolean;
}

export const DiceRollDisplay = ({
  diceValue,
  color,
  backgroundColor,
  rotation = 0,
  isPortrait = false,
  isWinner = false,
}: DiceRollDisplayProps) => {
  const [isRolling, setIsRolling] = useState(true);
  const [displayValue, setDisplayValue] = useState(1);
  const { totalRotation } = useRotationTransform({ rotation, isPortrait });

  // Rolling animation effect
  useEffect(() => {
    let frame = 0;
    const totalFrames = 18; // ~1.5s at 80ms intervals

    const interval = setInterval(() => {
      frame++;
      if (frame >= totalFrames) {
        setDisplayValue(diceValue);
        setIsRolling(false);
        clearInterval(interval);
      } else {
        // Random value 1-6 for rolling effect
        setDisplayValue(Math.floor(Math.random() * 6) + 1);
      }
    }, 80);

    return () => clearInterval(interval);
  }, [diceValue]);

  const DiceIcon = DiceIcons[displayValue as keyof typeof DiceIcons];

  // Winner gets a larger dice icon only after rolling stops
  const baseSize = !isRolling && isWinner ? 120 : 80;
  const finalScale = isWinner ? 1.3 : 1;

  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center touch-none"
      style={{ backgroundColor }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/60 pointer-events-none" />

      {/* Dice display with rotation correction */}
      <motion.div
        className="relative flex items-center justify-center"
        style={{ transform: `rotate(${-totalRotation}deg)` }}
        animate={
          isRolling
            ? {
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0],
              }
            : {
                scale: [1.2, finalScale],
              }
        }
        transition={
          isRolling
            ? { duration: 0.15, repeat: Infinity }
            : { type: 'spring', stiffness: 500, damping: 25 }
        }
      >
        <DiceIcon
          size={baseSize}
          color={color}
          style={{ filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5))' }}
        />
      </motion.div>
    </div>
  );
};
