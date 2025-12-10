import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, User, Palette } from 'lucide-react';
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
        className="fixed inset-0 z-50 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Full-screen gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900" />

        {/* Close button - fixed to top right of screen */}
        <button
          className="fixed top-4 right-4 z-20 p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 transition-colors"
          onClick={onClose}
        >
          <X size={24} color="white" />
        </button>

        <motion.div
          className="relative z-10 p-6 mx-4 max-w-sm w-full max-h-[85vh] overflow-y-auto"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white">Player Settings</h2>
          </div>

          {/* Name input */}
          <div className="mb-6">
            <div className="flex items-center justify-center gap-2 mb-3">
              <User size={18} className="text-white/70" />
              <span className="text-white/70 text-sm font-medium">Name</span>
            </div>
            <input
              type="text"
              value={name}
              onChange={handleNameChange}
              onBlur={handleNameBlur}
              className="w-full px-4 py-3 bg-white/5 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-blue-500"
              placeholder="Player name"
            />
          </div>

          {/* Color picker */}
          <div className="mb-6">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Palette size={18} className="text-white/70" />
              <span className="text-white/70 text-sm font-medium">Background Color</span>
            </div>
            <ColorPicker
              value={player.theme.backgroundColor}
              onChange={handleColorChange}
            />
          </div>

          {/* Commander damage summary */}
          {opponents.length > 0 && (
            <div>
              <div className="flex items-center justify-center gap-2 mb-3">
                <Shield size={18} className="text-white/70" />
                <span className="text-white/70 text-sm font-medium">
                  Commander Damage ({totalCommanderDamage})
                </span>
              </div>
              <div className="space-y-2">
                {opponents.map(opponent => {
                  const damage = player.commanderDamage[opponent.id] || 0;
                  return (
                    <div
                      key={opponent.id}
                      className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 backdrop-blur-md border border-white/10"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg"
                          style={{ backgroundColor: opponent.theme.backgroundColor }}
                        />
                        <span className="text-white/80 text-sm font-medium">{opponent.name}</span>
                      </div>
                      <span
                        className={`font-mono font-bold text-lg ${
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
