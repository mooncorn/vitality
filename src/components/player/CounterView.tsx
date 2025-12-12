import { Heart, Swords } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CounterType } from '@/types';
import { CustomIcon, type IconConfig } from '@/components/ui/CustomIcon';

interface CounterViewProps {
  type: CounterType;
  value: number;
  color?: string;
  delta?: number;
}

const iconConfig: Record<CounterType, IconConfig> = {
  life: { icon: Heart },
  poison: { className: 'ms ms-h' },
  energy: { className: 'ms ms-e' },
  commander: { icon: Swords },
  experience: { text: 'XP' },
  radiation: { className: 'ms ms-counter-rad' },
};

export const CounterView = ({ type, value, color = '#ffffff', delta = 0 }: CounterViewProps) => {
  const config = iconConfig[type];

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
      <CustomIcon config={config} size={16} fill={color} color={color} />
    </div>
  );
};
