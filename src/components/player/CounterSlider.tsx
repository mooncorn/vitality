import { motion, AnimatePresence, type MotionValue } from 'framer-motion';
import type { CounterState } from '@/types';
import { CounterView } from './CounterView';

interface CounterSliderProps {
  counters: CounterState[];
  activeIndex: number;
  color?: string;
  delta?: number;
  dragOffset: MotionValue<number>;
}

export const CounterSlider = ({
  counters,
  activeIndex,
  color = '#ffffff',
  delta = 0,
  dragOffset,
}: CounterSliderProps) => {
  const currentCounter = counters[activeIndex];

  return (
    <div className="h-full w-full">
      <motion.div style={{ x: dragOffset }} className="h-full w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIndex}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.2 }}
            className="h-full w-full"
          >
            <CounterView
              type={currentCounter.type}
              value={currentCounter.value}
              color={color}
              delta={delta}
            />
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Counter indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
        {counters.map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-colors ${
              i === activeIndex ? 'bg-white' : 'bg-white/30'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
