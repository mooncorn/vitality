import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import type { Player } from '@/types';
import { useGameStore } from '@/store/gameStore';
import { CustomIcon } from '@/components/ui/CustomIcon';
import { COUNTER_ICON_CONFIG, SECONDARY_COUNTERS } from '@/constants/counters';

interface CounterToggleModalProps {
  player: Player;
  isOpen: boolean;
  onClose: () => void;
}

export const CounterToggleModal = ({
  player,
  isOpen,
  onClose,
}: CounterToggleModalProps) => {
  const toggleSecondaryCounter = useGameStore(state => state.toggleSecondaryCounter);

  const handleToggle = (counterType: typeof SECONDARY_COUNTERS[number]['type']) => {
    const isEnabled = player.enabledSecondaryCounters.includes(counterType);
    toggleSecondaryCounter(player.id, counterType, !isEnabled);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="absolute inset-0 z-40 flex flex-col items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, pointerEvents: 'none' as const }}
          transition={{ duration: 0.15 }}
        >
          {/* Glass background - click to close */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Close button */}
          <button
            className="absolute top-3 right-3 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            onClick={onClose}
          >
            <X size={20} color="white" />
          </button>

          {/* Content */}
          <motion.div
            className="relative z-10 p-4 w-full max-w-xs"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h3 className="text-white text-center text-lg font-semibold mb-4">
              Counters
            </h3>

            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {SECONDARY_COUNTERS.map(({ type }) => {
                const isEnabled = player.enabledSecondaryCounters.includes(type);
                const iconConfig = COUNTER_ICON_CONFIG[type];

                return (
                  <button
                    key={type}
                    onClick={() => handleToggle(type)}
                    className={`py-2 rounded-xl backdrop-blur-md border transition-all duration-200 flex flex-col items-center justify-center gap-2 ${
                      isEnabled
                        ? 'bg-blue-500/20 border-blue-500/30 text-blue-400'
                        : 'bg-white/10 border-white/20 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    <CustomIcon
                      config={iconConfig}
                      size={16}
                      color={isEnabled ? '#60a5fa' : '#9ca3af'}
                    />
                  </button>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
