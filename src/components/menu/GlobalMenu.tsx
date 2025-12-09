import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, RotateCcw, Users, Settings } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { SettingsPanel } from './SettingsPanel';

export const GlobalMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const resetGame = useGameStore(state => state.resetGame);
  const setPlayerCount = useGameStore(state => state.setPlayerCount);
  const playerCount = useGameStore(state => state.settings.playerCount);

  const handleReset = () => {
    resetGame();
    setIsOpen(false);
  };

  const handlePlayerCountChange = (count: number) => {
    setPlayerCount(count);
    setIsOpen(false);
  };

  return (
    <>
      {/* FAB Button */}
      <button
        className="fixed bottom-1/2 left-1/2 -translate-x-1/2 translate-y-1/2 z-40 w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center hover:bg-white/30 transition-colors"
        onClick={() => setIsOpen(true)}
      >
        <Menu size={24} color="white" />
      </button>

      {/* Menu overlay */}
      {isOpen &&
        createPortal(
          <AnimatePresence>
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
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
                  <h2 className="text-white text-lg font-semibold">Game Menu</h2>
                  <button
                    className="p-1 rounded-full hover:bg-white/10 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <X size={20} color="white" />
                  </button>
                </div>

                {/* Player count */}
                <div className="mb-6">
                  <label className="text-white/70 text-sm mb-2 flex items-center gap-2">
                    <Users size={16} />
                    Players
                  </label>
                  <div className="flex gap-2">
                    {[2, 3, 4, 5, 6].map(count => (
                      <button
                        key={count}
                        className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                          playerCount === count
                            ? 'bg-white/30 text-white'
                            : 'bg-white/10 text-white/70 hover:bg-white/20'
                        }`}
                        onClick={() => handlePlayerCountChange(count)}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <button
                    className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
                    onClick={() => {
                      setIsOpen(false);
                      setShowSettings(true);
                    }}
                  >
                    <Settings size={20} color="white" />
                    <span className="text-white">Settings</span>
                  </button>

                  <button
                    className="w-full py-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 transition-colors flex items-center justify-center gap-2"
                    onClick={handleReset}
                  >
                    <RotateCcw size={20} color="#ef4444" />
                    <span className="text-red-400">Reset Game</span>
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </AnimatePresence>,
          document.body
        )}

      {/* Settings panel */}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </>
  );
};
