import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, RotateCcw, Users, Settings, Wifi, LogOut, Home, Copy, Check } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { useMultiplayerStore, selectIsInLobby } from '@/store/multiplayerStore';
import { SettingsPanel } from './SettingsPanel';

interface GlassButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

const GlassButton = ({ icon, label, onClick, variant = 'default' }: GlassButtonProps) => {
  const baseClasses = "w-full py-4 rounded-xl backdrop-blur-md border transition-all duration-200 flex flex-col items-center justify-center gap-2";
  const variantClasses = variant === 'danger'
    ? "bg-red-500/10 border-red-500/20 hover:bg-red-500/20 text-red-400"
    : "bg-white/10 border-white/20 hover:bg-white/20 text-white";

  return (
    <button className={`${baseClasses} ${variantClasses}`} onClick={onClick}>
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
};

export const GlobalMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [copied, setCopied] = useState(false);

  const resetCounters = useGameStore(state => state.resetCounters);
  const setPlayerCount = useGameStore(state => state.setPlayerCount);
  const setGameMode = useGameStore(state => state.setGameMode);
  const playerCount = useGameStore(state => state.settings.playerCount);
  const gameMode = useGameStore(state => state.gameMode);

  const isInLobby = useMultiplayerStore(selectIsInLobby);
  const { lobbyCode, isHost, leaveLobby, suspendLobby } = useMultiplayerStore();

  const handleReset = () => {
    resetCounters();
    setIsOpen(false);
  };

  const handlePlayerCountChange = (count: number) => {
    setPlayerCount(count);
    setIsOpen(false);
  };

  const handleBackToMenu = () => {
    if (isInLobby && isHost) {
      // Host suspends lobby (keeps it alive for resuming)
      suspendLobby();
    } else if (isInLobby) {
      // Guest leaves lobby completely
      leaveLobby();
    }
    setGameMode('menu');
    setIsOpen(false);
  };

  const handleLeaveLobby = () => {
    leaveLobby();
    setGameMode('menu');
    setIsOpen(false);
  };

  const handleCopyLobbyCode = useCallback(async () => {
    if (!lobbyCode) return;
    await navigator.clipboard.writeText(lobbyCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [lobbyCode]);

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
              className="fixed inset-0 z-50 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900" />

              {/* Close button - fixed to top right of screen */}
              <button
                className="fixed top-4 right-4 z-20 p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <X size={24} color="white" />
              </button>

              <motion.div
                className="relative z-10 p-6 mx-4 max-w-sm w-full max-h-[85vh] overflow-y-auto"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
              >

                {/* Player count */}
                <div className="mb-6">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <Users size={18} className="text-white/70" />
                    <span className="text-white/70 text-sm font-medium">Players</span>
                  </div>
                  <div className="flex gap-2">
                    {[2, 3, 4, 5, 6].map(count => (
                      <button
                        key={count}
                        className={`flex-1 py-3 rounded-xl backdrop-blur-md border font-medium transition-all duration-200 ${
                          playerCount === count
                            ? 'bg-white/20 border-white/30 text-white'
                            : 'bg-white/10 border-white/20 text-white/70 hover:bg-white/20 hover:text-white'
                        }`}
                        onClick={() => handlePlayerCountChange(count)}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Lobby Status (multiplayer only) */}
                {gameMode === 'multiplayer' && isInLobby && (
                  <div className="mb-6">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <Wifi size={18} className="text-white/70" />
                      <span className="text-white/70 text-sm font-medium">Lobby</span>
                    </div>
                    <div className="space-y-2">
                      <button
                        onClick={handleCopyLobbyCode}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-green-500/10 backdrop-blur-md rounded-xl border border-green-500/30 hover:bg-green-500/20 transition-colors"
                      >
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="font-mono font-bold text-green-400 tracking-wider">
                          {lobbyCode}
                        </span>
                        {copied ? (
                          <Check size={16} className="text-green-400" />
                        ) : (
                          <Copy size={16} className="text-green-400/60" />
                        )}
                      </button>
                      <GlassButton
                        icon={<LogOut size={20} />}
                        label={isHost ? 'Close Lobby' : 'Leave Lobby'}
                        onClick={handleLeaveLobby}
                        variant="danger"
                      />
                    </div>
                  </div>
                )}

                {/* Actions Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <GlassButton
                    icon={<Settings size={22} />}
                    label="Settings"
                    onClick={() => {
                      setIsOpen(false);
                      setShowSettings(true);
                    }}
                  />
                  <GlassButton
                    icon={<RotateCcw size={22} />}
                    label="Reset"
                    onClick={handleReset}
                    variant="danger"
                  />
                  <div className="col-span-2">
                    <GlassButton
                      icon={<Home size={22} />}
                      label="Back to Menu"
                      onClick={handleBackToMenu}
                    />
                  </div>
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
