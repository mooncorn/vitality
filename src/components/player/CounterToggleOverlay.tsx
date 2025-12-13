import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import type { CounterType, Player } from '@/types';
import { useGameStore } from '@/store/gameStore';
import { CustomIcon, type IconConfig } from '@/components/ui/CustomIcon';

interface CounterToggleOverlayProps {
  player: Player;
  isOpen: boolean;
  onClose: () => void;
}

const SECONDARY_COUNTERS: { type: CounterType; iconConfig: IconConfig; label: string }[] = [
  { type: 'poison', iconConfig: { className: 'ms ms-h' }, label: 'Poison' },
  { type: 'energy', iconConfig: { className: 'ms ms-e' }, label: 'Energy' },
  { type: 'experience', iconConfig: { text: 'XP' }, label: 'Experience' },
  { type: 'radiation', iconConfig: { className: 'ms ms-counter-rad' }, label: 'Radiation' },
];

export const CounterToggleOverlay = ({
  player,
  isOpen,
  onClose,
}: CounterToggleOverlayProps) => {
  const toggleSecondaryCounter = useGameStore(state => state.toggleSecondaryCounter);

  const handleToggle = (counterType: CounterType) => {
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
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Glass background */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

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
              {SECONDARY_COUNTERS.map(({ type, iconConfig }) => {
                const isEnabled = player.enabledSecondaryCounters.includes(type);

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
