import { Heart, ShieldHalf, Zap, Swords, Sparkle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CounterType } from '@/types';

interface CounterViewProps {
  type: CounterType;
  value: number;
  color?: string;
  delta?: number;
}

const iconMap = {
  life: Heart,
  poison: ShieldHalf,
  energy: Zap,
  commander: Swords,
  experience: Sparkle,
};

export const CounterView = ({ type, value, color = '#ffffff', delta = 0 }: CounterViewProps) => {
  const Icon = iconMap[type];

  return (
    <div className="flex flex-col items-center justify-center h-full w-full relative">
      <AnimatePresence>
        {delta !== 0 && (
          <motion.span
            key="delta"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute text-[4vmin] font-thin opacity-60"
            style={{
              color,
              top: '15%',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
            }}
          >
            {delta > 0 ? `+${delta}` : delta}
          </motion.span>
        )}
      </AnimatePresence>
      <span
        className="counter-value text-[18vmin] leading-none"
        style={{ color, textShadow: '0 4px 8px rgba(0, 0, 0, 0.5)' }}
      >
        {value}
      </span>
      <Icon size={16} fill={color} style={{ color }} />
    </div>
  );
};
