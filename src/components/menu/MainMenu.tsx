// MainMenu - Initial menu displayed when app opens
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { Gamepad2, Globe, Link, Loader2, ArrowLeft, Plus, Users, Clock, Trash2 } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { useMultiplayerStore } from '@/store/multiplayerStore';
import { useAuthStore, selectIsAuthenticated } from '@/store/authStore';
import { AuthButton } from '@/components/auth/AuthButton';
import { GlassButton } from '@/components/ui/GlassButton';
import { formatRelativeTime } from '@/utils/time';
import type { UserLobbyEntry } from '@/types/multiplayer';

type MenuView = 'main' | 'local' | 'create' | 'join';

export const MainMenu = () => {
  const [view, setView] = useState<MenuView>('main');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
      <AnimatePresence mode="wait">
        {view === 'main' && (
          <MainView
            key="main"
            onLocalGame={() => setView('local')}
            onCreateLobby={() => setView('create')}
            onJoinLobby={() => setView('join')}
          />
        )}
        {view === 'local' && (
          <LocalGameView key="local" onBack={() => setView('main')} />
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

// Reusable saved game item component for both local and multiplayer menus
interface SavedGameItemProps {
  lobby: UserLobbyEntry;
  onSelect: () => void;
  onDelete: () => void;
  isLoading?: boolean;
  showLobbyCode?: boolean;
}

const DELETE_BUTTON_WIDTH = 60;
const SWIPE_THRESHOLD = 30;

const SavedGameItem = ({
  lobby,
  onSelect,
  onDelete,
  isLoading = false,
  showLobbyCode = false,
}: SavedGameItemProps) => {
  const playerCount = lobby.gameState.settings.playerCount;
  const x = useMotionValue(0);
  const deleteOpacity = useTransform(x, [-DELETE_BUTTON_WIDTH, 0], [1, 0]);
  const constraintsRef = useRef<HTMLDivElement>(null);

  const handleDragEnd = () => {
    const currentX = x.get();
    if (currentX < -SWIPE_THRESHOLD) {
      // Snap open (with 4px gap)
      animate(x, -(DELETE_BUTTON_WIDTH + 4), { type: 'spring', stiffness: 500, damping: 30 });
    } else {
      // Snap closed
      animate(x, 0, { type: 'spring', stiffness: 500, damping: 30 });
    }
  };

  const handleDelete = () => {
    // Animate closed then delete
    animate(x, 0, { type: 'spring', stiffness: 500, damping: 30 });
    onDelete();
  };

  return (
    <div className="relative overflow-hidden" ref={constraintsRef}>
      {/* Delete button positioned behind */}
      <motion.button
        onClick={handleDelete}
        disabled={isLoading}
        style={{ opacity: deleteOpacity }}
        className="absolute right-0 top-0 bottom-0 flex items-center justify-center bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl"
        title="Delete session"
      >
        <div className="w-[56px] flex items-center justify-center">
          <Trash2 size={20} className="text-white" />
        </div>
      </motion.button>

      {/* Swipeable content */}
      <motion.button
        onClick={onSelect}
        disabled={isLoading}
        style={{ x }}
        drag="x"
        dragConstraints={{ left: -(DELETE_BUTTON_WIDTH + 4), right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        className="relative w-full p-3 backdrop-blur-md border transition-colors duration-200 bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-left"
      >
        {showLobbyCode ? (
          // Two-line layout for multiplayer: name on first line, code + details on second
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              {isLoading && (
                <Loader2 size={14} className="animate-spin text-white/50" />
              )}
              <span className="font-medium text-white">
                {lobby.name || 'Unnamed Session'}
              </span>
            </div>
            <div className="flex items-center gap-3 text-white/60 text-sm">
              {lobby.lobbyCode && (
                <span className="font-mono text-xs">
                  {lobby.lobbyCode}
                </span>
              )}
              <div className="flex items-center gap-1">
                <Users size={14} />
                <span>{playerCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock size={14} />
                <span>{formatRelativeTime(lobby.createdAt)}</span>
              </div>
            </div>
          </div>
        ) : (
          // Two-line layout for local games: name on first line, details on second
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              {isLoading && (
                <Loader2 size={14} className="animate-spin text-white/50" />
              )}
              <span className="font-medium text-white">
                {lobby.name || 'Unnamed Session'}
              </span>
            </div>
            <div className="flex items-center gap-3 text-white/60 text-sm">
              <div className="flex items-center gap-1">
                <Users size={14} />
                <span>{playerCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock size={14} />
                <span>{formatRelativeTime(lobby.createdAt)}</span>
              </div>
            </div>
          </div>
        )}
      </motion.button>
    </div>
  );
};

const LocalGameView = ({ onBack }: { onBack: () => void }) => {
  const { myLobbies, fetchMyLobbies, deleteSession, isLoadingLobbies, createLocalSession } = useMultiplayerStore();
  const setGameMode = useGameStore(state => state.setGameMode);
  const restoreState = useGameStore(state => state.restoreState);

  useEffect(() => {
    fetchMyLobbies();
  }, [fetchMyLobbies]);

  const handleResume = (lobby: UserLobbyEntry) => {
    if (lobby.gameState) {
      restoreState(lobby.gameState, lobby.id);
    }
    setGameMode('local');
  };

  const handleNewGame = () => {
    createLocalSession();
    setGameMode('local');
  };

  return (
    <>
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
        <h2 className="text-2xl font-bold text-white">Local Game</h2>

        <div className="w-full space-y-4">
          {isLoadingLobbies ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-white/50" />
            </div>
          ) : myLobbies.length > 0 ? (
            <div className="space-y-2">
              <p className="text-white/60 text-sm text-center mb-3">Saved Games</p>
              <div className="max-h-[30vh] overflow-y-auto space-y-2 pr-1">
                {myLobbies.map((lobby) => (
                  <SavedGameItem
                    key={lobby.id}
                    lobby={lobby}
                    onSelect={() => handleResume(lobby)}
                    onDelete={() => deleteSession(lobby.id)}
                    showLobbyCode={false}
                  />
                ))}
              </div>
            </div>
          ) : (
            <p className="text-white/60 text-center">
              No saved games yet
            </p>
          )}

          <GlassButton
            icon={<Plus size={22} />}
            label="New Game"
            onClick={handleNewGame}
            variant="primary"
          />
        </div>
      </motion.div>
    </>
  );
};

const CreateLobbyView = ({ onBack }: { onBack: () => void }) => {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const { error, createLobby, resumeLobby, fetchMyLobbies, myLobbies, isLoadingLobbies, deleteSession } = useMultiplayerStore();
  const setGameMode = useGameStore(state => state.setGameMode);
  const restoreState = useGameStore(state => state.restoreState);
  const [isCreating, setIsCreating] = useState(false);
  const [resumingId, setResumingId] = useState<string | null>(null);

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

  const handleResume = async (id: string) => {
    const session = myLobbies.find(l => l.id === id);
    if (!session) return;

    setResumingId(id);
    try {
      if (session.lobbyCode) {
        // Session was previously hosted - resume the existing lobby
        await resumeLobby(id);
      } else {
        // Local session - restore state first, then host with the same session ID
        if (session.gameState) {
          restoreState(session.gameState, id);
        }
        await createLobby(id);
      }
      setGameMode('multiplayer');
    } catch {
      // Error handled in store
    } finally {
      setResumingId(null);
    }
  };

  const handleDelete = (id: string) => {
    deleteSession(id);
  };

  const isLoading = isCreating || resumingId !== null;

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

          {/* Previous sessions list */}
          {isLoadingLobbies ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-white/50" />
            </div>
          ) : myLobbies.length > 0 ? (
            <div className="space-y-2">
              <p className="text-white/60 text-sm text-center mb-3">Saved Games</p>
              <div className="max-h-[30vh] overflow-y-auto space-y-2 pr-1">
                {myLobbies.slice(0, 5).map((lobby) => (
                  <SavedGameItem
                    key={lobby.id}
                    lobby={lobby}
                    onSelect={() => handleResume(lobby.id)}
                    onDelete={() => handleDelete(lobby.id)}
                    isLoading={isLoading && resumingId === lobby.id}
                    showLobbyCode={true}
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
