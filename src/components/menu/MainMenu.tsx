// MainMenu - Initial menu displayed when app opens
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gamepad2, Globe, Link, Loader2, ArrowLeft, Plus, Users, Clock } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { useMultiplayerStore } from '@/store/multiplayerStore';
import { useAuthStore, selectIsAuthenticated } from '@/store/authStore';
import { AuthButton } from '@/components/auth/AuthButton';
import type { UserLobbyEntry } from '@/types/multiplayer';

interface GlassButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'primary';
  disabled?: boolean;
  loading?: boolean;
}

const GlassButton = ({ icon, label, onClick, variant = 'default', disabled, loading }: GlassButtonProps) => {
  const baseClasses = "w-full py-4 rounded-xl backdrop-blur-md border transition-all duration-200 flex flex-col items-center justify-center gap-2";
  const variantClasses = variant === 'primary'
    ? "bg-blue-500/20 border-blue-500/30 hover:bg-blue-500/30 text-blue-400"
    : "bg-white/10 border-white/20 hover:bg-white/20 text-white";
  const disabledClasses = disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer";

  return (
    <button
      className={`${baseClasses} ${variantClasses} ${disabledClasses}`}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? <Loader2 size={22} className="animate-spin" /> : icon}
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
};

type MenuView = 'main' | 'create' | 'join';

export const MainMenu = () => {
  const [view, setView] = useState<MenuView>('main');
  const setGameMode = useGameStore(state => state.setGameMode);

  const handleLocalGame = () => {
    setGameMode('local');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
      <AnimatePresence mode="wait">
        {view === 'main' && (
          <MainView
            key="main"
            onLocalGame={handleLocalGame}
            onCreateLobby={() => setView('create')}
            onJoinLobby={() => setView('join')}
          />
        )}
        {view === 'create' && (
          <CreateLobbyView key="create" onBack={() => setView('main')} />
        )}
        {view === 'join' && (
          <JoinLobbyView key="join" onBack={() => setView('main')} />
        )}
      </AnimatePresence>
    </div>
  );
};

interface MainViewProps {
  onLocalGame: () => void;
  onCreateLobby: () => void;
  onJoinLobby: () => void;
}

const MainView = ({ onLocalGame, onCreateLobby, onJoinLobby }: MainViewProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center gap-6 p-8 w-full max-w-sm"
    >
      <div className="text-center mb-4">
        <h1 className="text-4xl font-bold text-white">Vitality</h1>
        <p className="text-white/50 text-sm mt-1">Life counter for Magic: The Gathering</p>
      </div>

      <div className="w-full">
        <div className="flex flex-col gap-2">
          <div className="col-span-2">
            <GlassButton
              icon={<Gamepad2 size={20} />}
              label="Local"
              onClick={onLocalGame}
              variant="primary"
            />
          </div>
          <div className="flex gap-2">
            <GlassButton
              icon={<Globe size={20} />}
              label="Host"
              onClick={onCreateLobby}
              variant="default"
            />
            <GlassButton
              icon={<Link size={20} />}
              label="Join"
              onClick={onJoinLobby}
              variant="default"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Helper to format relative time
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// Lobby item component
const LobbyItem = ({
  lobby,
  onResume,
  isResuming,
}: {
  lobby: UserLobbyEntry;
  onResume: (code: string) => void;
  isResuming: boolean;
}) => {
  return (
    <button
      onClick={() => onResume(lobby.lobbyCode)}
      disabled={isResuming}
      className="w-full p-3 rounded-xl backdrop-blur-md border transition-all duration-200 bg-green-500/10 border-green-500/30 hover:bg-green-500/20 hover:border-green-500/50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isResuming ? (
            <Loader2 size={14} className="animate-spin text-green-500" />
          ) : (
            <div className="w-2 h-2 rounded-full bg-green-500" />
          )}
          <span className="font-mono font-bold text-white tracking-wider">
            {lobby.lobbyCode}
          </span>
        </div>
        <div className="flex items-center gap-3 text-white/60 text-sm">
          <div className="flex items-center gap-1">
            <Users size={14} />
            <span>{lobby.playerCount || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock size={14} />
            <span>{formatRelativeTime(lobby.createdAt)}</span>
          </div>
        </div>
      </div>
    </button>
  );
};

const CreateLobbyView = ({ onBack }: { onBack: () => void }) => {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const { error, createLobby, resumeLobby, fetchMyLobbies, myLobbies, isLoadingLobbies } = useMultiplayerStore();
  const setGameMode = useGameStore(state => state.setGameMode);
  const [isCreating, setIsCreating] = useState(false);
  const [resumingCode, setResumingCode] = useState<string | null>(null);

  // Fetch lobbies when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchMyLobbies();
    }
  }, [isAuthenticated, fetchMyLobbies]);

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      await createLobby();
      setGameMode('multiplayer');
    } catch {
      // Error handled in store
    } finally {
      setIsCreating(false);
    }
  };

  const handleResume = async (code: string) => {
    setResumingCode(code);
    try {
      await resumeLobby(code);
      setGameMode('multiplayer');
    } catch {
      // Error handled in store
    } finally {
      setResumingCode(null);
    }
  };

  const isLoading = isCreating || resumingCode !== null;

  return (
    <>
      {/* Back button - fixed to top left of screen, outside animation */}
      <button
        onClick={onBack}
        className="fixed top-4 left-4 z-20 p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 transition-colors"
      >
        <ArrowLeft size={24} color="white" />
      </button>

      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="flex flex-col items-center gap-6 p-8 w-full max-w-sm"
      >
        <h2 className="text-2xl font-bold text-white">Host Game</h2>

      {!isAuthenticated ? (
        <div className="w-full space-y-4">
          <p className="text-white/60 text-center">
            Sign in to create a multiplayer lobby
          </p>
          <AuthButton />
        </div>
      ) : (
        <div className="w-full space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Previous lobbies list */}
          {isLoadingLobbies ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-white/50" />
            </div>
          ) : myLobbies.length > 0 ? (
            <div className="space-y-2">
              <p className="text-white/60 text-sm text-center mb-3">Recent Lobbies</p>
              <div className="max-h-[30vh] overflow-y-auto space-y-2 pr-1">
                {myLobbies.slice(0, 5).map((lobby) => (
                  <LobbyItem
                    key={lobby.lobbyCode}
                    lobby={lobby}
                    onResume={handleResume}
                    isResuming={isLoading && resumingCode === lobby.lobbyCode}
                  />
                ))}
              </div>
            </div>
          ) : (
            <p className="text-white/60 text-center">
              Create a lobby and share the code with friends
            </p>
          )}

          {/* Create new lobby button */}
          <GlassButton
            icon={isCreating ? <Loader2 size={22} className="animate-spin" /> : <Plus size={22} />}
            label="Create New Lobby"
            onClick={handleCreate}
            disabled={isLoading}
            loading={isCreating}
            variant="primary"
          />
        </div>
      )}
      </motion.div>
    </>
  );
};

const JoinLobbyView = ({ onBack }: { onBack: () => void }) => {
  const { error, joinAsGuest, clearError } = useMultiplayerStore();
  const setGameMode = useGameStore(state => state.setGameMode);
  const [code, setCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const handleJoin = async () => {
    if (code.length !== 6) return;

    setIsJoining(true);
    clearError();
    try {
      await joinAsGuest(code);
      setGameMode('multiplayer');
    } catch {
      // Error handled in store
    } finally {
      setIsJoining(false);
    }
  };

  const handleCodeChange = (value: string) => {
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setCode(cleaned);
  };

  const canJoin = code.length === 6;

  return (
    <>
      {/* Back button - fixed to top left of screen, outside animation */}
      <button
        onClick={onBack}
        className="fixed top-4 left-4 z-20 p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 transition-colors"
      >
        <ArrowLeft size={24} color="white" />
      </button>

      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="flex flex-col items-center gap-6 p-8 w-full max-w-sm"
      >
        <h2 className="text-2xl font-bold text-white">Join Lobby</h2>

      <div className="w-full space-y-4">
        <div>
          <label className="text-white/60 text-xs uppercase tracking-wide mb-1 block">
            Lobby Code
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            placeholder="ABC123"
            className="w-full px-4 py-3 text-center text-2xl font-mono font-bold tracking-widest bg-white/5 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-blue-500 uppercase"
            maxLength={6}
            autoFocus
          />
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <GlassButton
          icon={<Link size={22} />}
          label="Join Lobby"
          onClick={handleJoin}
          disabled={!canJoin}
          loading={isJoining}
          variant="primary"
        />
      </div>
      </motion.div>
    </>
  );
};

export default MainMenu;
