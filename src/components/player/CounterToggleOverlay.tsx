import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDrag } from '@use-gesture/react';
import { X, Shield, Zap, Sparkle } from 'lucide-react';
import type { CounterType, Player } from '@/types';
import { useGameStore } from '@/store/gameStore';

interface CounterToggleOverlayProps {
  player: Player;
  isOpen: boolean;
  onClose: () => void;
  rotation?: number;
  isPortrait?: boolean;
}

const SECONDARY_COUNTERS: { type: CounterType; icon: typeof Shield; label: string }[] = [
  { type: 'poison', icon: Shield, label: 'Poison' },
  { type: 'energy', icon: Zap, label: 'Energy' },
  { type: 'experience', icon: Sparkle, label: 'Experience' },
];

const SWIPE_THRESHOLD = 50;

export const CounterToggleOverlay = ({
  player,
  isOpen,
  onClose,
  rotation = 0,
  isPortrait = false,
}: CounterToggleOverlayProps) => {
  const toggleSecondaryCounter = useGameStore(state => state.toggleSecondaryCounter);
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleToggle = (counterType: CounterType) => {
    const isEnabled = player.enabledSecondaryCounters.includes(counterType);
    toggleSecondaryCounter(player.id, counterType, !isEnabled);
  };

  // Swipe down to close
  useDrag(
    ({ movement: [mx, my], last }) => {
      const totalRotation = (rotation + (isPortrait ? 90 : 0)) % 360;

      let cardVertical: number;
      if (totalRotation === 90) {
        cardVertical = -mx;
      } else if (totalRotation === 270) {
        cardVertical = mx;
      } else if (totalRotation === 180) {
        cardVertical = -my;
      } else {
        cardVertical = my;
      }

      if (last && cardVertical > SWIPE_THRESHOLD) {
        onClose();
      }
    },
    { target: overlayRef, filterTaps: true }
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={overlayRef}
          className="absolute inset-0 z-40 flex flex-col items-center justify-center touch-none"
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

            <div className="space-y-2">
              {SECONDARY_COUNTERS.map(({ type, icon: Icon, label }) => {
                const isEnabled = player.enabledSecondaryCounters.includes(type);

                return (
                  <button
                    key={type}
                    onClick={() => handleToggle(type)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
                      isEnabled
                        ? 'bg-white/20 border border-white/30'
                        : 'bg-white/5 border border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        size={20}
                        color={isEnabled ? player.theme.primaryColor : '#888'}
                      />
                      <span
                        className={`font-medium ${
                          isEnabled ? 'text-white' : 'text-white/50'
                        }`}
                      >
                        {label}
                      </span>
                    </div>

                    {/* Toggle indicator */}
                    <div
                      className={`w-10 h-6 rounded-full transition-colors ${
                        isEnabled ? 'bg-green-500' : 'bg-white/20'
                      }`}
                    >
                      <motion.div
                        className="w-5 h-5 bg-white rounded-full mt-0.5"
                        animate={{ x: isEnabled ? 18 : 2 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Swipe hint */}
            <p className="text-white/40 text-xs text-center mt-4">
              Swipe down to close
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
