import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield } from 'lucide-react';
import type { Player } from '@/types';
import { useGameStore } from '@/store/gameStore';
import { ColorPicker } from '@/components/ui/ColorPicker';

interface PlayerOverlayProps {
  player: Player;
  onClose: () => void;
}

export const PlayerOverlay = ({ player, onClose }: PlayerOverlayProps) => {
  const players = useGameStore(state => state.players);
  const setPlayerName = useGameStore(state => state.setPlayerName);
  const setPlayerTheme = useGameStore(state => state.setPlayerTheme);

  const [name, setName] = useState(player.name);

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setName(e.target.value);
    },
    []
  );

  const handleNameBlur = useCallback(() => {
    if (name.trim()) {
      setPlayerName(player.id, name.trim());
    } else {
      setName(player.name);
    }
  }, [name, player.id, player.name, setPlayerName]);

  const handleColorChange = useCallback(
    (color: string) => {
      setPlayerTheme(player.id, { backgroundColor: color });
    },
    [player.id, setPlayerTheme]
  );

  // Get commander damage info
  const opponents = players.filter(p => p.id !== player.id);
  const totalCommanderDamage = Object.values(player.commanderDamage).reduce(
    (sum, dmg) => sum + dmg,
    0
  );

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
          className="glass-panel p-6 mx-4 max-w-sm w-full max-h-[80vh] overflow-y-auto"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-white text-lg font-semibold">Player Settings</h2>
            <button
              className="p-1 rounded-full hover:bg-white/10 transition-colors"
              onClick={onClose}
            >
              <X size={20} color="white" />
            </button>
          </div>

          {/* Name input */}
          <div className="mb-6">
            <label className="text-white/70 text-sm mb-2 block">Name</label>
            <input
              type="text"
              value={name}
              onChange={handleNameChange}
              onBlur={handleNameBlur}
              className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/30 focus:outline-none focus:border-white/40"
              placeholder="Player name"
            />
          </div>

          {/* Color picker */}
          <div className="mb-6">
            <label className="text-white/70 text-sm mb-2 block">Background Color</label>
            <ColorPicker
              value={player.theme.backgroundColor}
              onChange={handleColorChange}
            />
          </div>

          {/* Commander damage summary */}
          {opponents.length > 0 && (
            <div>
              <label className="text-white/70 text-sm mb-2 flex items-center gap-2">
                <Shield size={16} />
                Commander Damage Received ({totalCommanderDamage})
              </label>
              <div className="space-y-2">
                {opponents.map(opponent => {
                  const damage = player.commanderDamage[opponent.id] || 0;
                  return (
                    <div
                      key={opponent.id}
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-full"
                          style={{ backgroundColor: opponent.theme.backgroundColor }}
                        />
                        <span className="text-white/80 text-sm">{opponent.name}</span>
                      </div>
                      <span
                        className={`font-mono font-bold ${
                          damage >= 21 ? 'text-red-400' : 'text-white'
                        }`}
                      >
                        {damage}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};
