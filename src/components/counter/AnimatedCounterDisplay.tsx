import { motion, AnimatePresence } from 'framer-motion';
import type { CounterState } from '@/types';
import { CounterView } from './CounterView';

interface AnimatedCounterDisplayProps {
  counter: CounterState;
  color?: string;
  delta?: number;
}

export const AnimatedCounterDisplay = ({
  counter,
  color = '#ffffff',
  delta = 0,
}: AnimatedCounterDisplayProps) => {
  return (
    <div className="h-full w-full">
      <AnimatePresence mode="wait">
        <motion.div
          key={counter.type}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="h-full w-full"
        >
          <CounterView
            type={counter.type}
            value={counter.value}
            color={color}
            delta={delta}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
