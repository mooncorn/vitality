import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Plus, Check } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';

interface CommanderDamageModalProps {
  sourcePlayerId: string;
  targetPlayerId: string;
  onClose: () => void;
}

export const CommanderDamageModal = ({
  sourcePlayerId,
  targetPlayerId,
  onClose,
}: CommanderDamageModalProps) => {
  const players = useGameStore(state => state.players);
  const updateCommanderDamage = useGameStore(state => state.updateCommanderDamage);
  const updateCounter = useGameStore(state => state.updateCounter);

  const sourcePlayer = players.find(p => p.id === sourcePlayerId);
  const targetPlayer = players.find(p => p.id === targetPlayerId);

  const [amount, setAmount] = useState(1);

  const handleConfirm = useCallback(() => {
    if (amount > 0) {
      // Add commander damage to target
      updateCommanderDamage(targetPlayerId, sourcePlayerId, amount);
      // Also reduce target's life
      updateCounter(targetPlayerId, 'life', -amount);
    }
    onClose();
  }, [amount, sourcePlayerId, targetPlayerId, updateCommanderDamage, updateCounter, onClose]);

  const handleIncrement = useCallback(() => {
    setAmount(prev => prev + 1);
  }, []);

  const handleDecrement = useCallback(() => {
    setAmount(prev => Math.max(1, prev - 1));
  }, []);

  if (!sourcePlayer || !targetPlayer) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="glass-panel p-6 mx-4 max-w-sm w-full"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-white text-lg font-semibold">Commander Damage</h2>
            <button
              className="p-1 rounded-full hover:bg-white/10 transition-colors"
              onClick={onClose}
            >
              <X size={20} color="white" />
            </button>
          </div>

          {/* Player info */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="flex flex-col items-center">
              <div
                className="w-12 h-12 rounded-full border-2 border-white/30"
                style={{ backgroundColor: sourcePlayer.theme.backgroundColor }}
              />
              <span className="text-white/70 text-sm mt-1">{sourcePlayer.name}</span>
            </div>
            <div className="text-white/50 text-2xl">→</div>
            <div className="flex flex-col items-center">
              <div
                className="w-12 h-12 rounded-full border-2 border-white/30"
                style={{ backgroundColor: targetPlayer.theme.backgroundColor }}
              />
              <span className="text-white/70 text-sm mt-1">{targetPlayer.name}</span>
            </div>
          </div>

          {/* Amount selector */}
          <div className="flex items-center justify-center gap-6 mb-6">
            <button
              className="p-3 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 transition-colors"
              onClick={handleDecrement}
            >
              <Minus size={24} color="white" />
            </button>
            <span className="text-white text-5xl font-mono font-bold min-w-[80px] text-center">
              {amount}
            </span>
            <button
              className="p-3 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 transition-colors"
              onClick={handleIncrement}
            >
              <Plus size={24} color="white" />
            </button>
          </div>

          {/* Confirm button */}
          <button
            className="w-full py-3 rounded-xl bg-white/20 hover:bg-white/30 active:bg-white/40 transition-colors flex items-center justify-center gap-2"
            onClick={handleConfirm}
          >
            <Check size={20} color="white" />
            <span className="text-white font-medium">Apply Damage</span>
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};
