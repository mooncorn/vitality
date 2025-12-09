import { useRef } from 'react';
import { useDrag } from '@use-gesture/react';
import { motion, AnimatePresence, useMotionValue, animate } from 'framer-motion';
import type { CounterState } from '@/types';
import { CounterView } from './CounterView';

interface CounterSliderProps {
  counters: CounterState[];
  activeIndex: number;
  onIndexChange: (index: number) => void;
  color?: string;
  delta?: number;
}

const THRESHOLD = 50;

export const CounterSlider = ({
  counters,
  activeIndex,
  onIndexChange,
  color = '#ffffff',
  delta = 0,
}: CounterSliderProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);

  useDrag(
    ({ movement: [mx], last }) => {
      if (last) {
        if (mx < -THRESHOLD && activeIndex < counters.length - 1) {
          onIndexChange(activeIndex + 1);
        } else if (mx > THRESHOLD && activeIndex > 0) {
          onIndexChange(activeIndex - 1);
        }
        animate(x, 0, { type: 'spring', stiffness: 300, damping: 30 });
      } else {
        // Limit drag distance
        const clampedX = Math.max(-100, Math.min(100, mx));
        x.set(clampedX);
      }
    },
    { target: containerRef, axis: 'x', filterTaps: true }
  );

  const currentCounter = counters[activeIndex];

  return (
    <div
      ref={containerRef}
      className="h-full w-full touch-none"
    >
      <motion.div style={{ x }} className="h-full w-full">
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
