import { useState, useCallback } from 'react';
import { Shield, User, Palette } from 'lucide-react';
import type { Player } from '@/types';
import { useGameStore } from '@/store/gameStore';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { ModalOverlay } from '@/components/ui/ModalOverlay';

interface PlayerSettingsModalProps {
  player: Player;
  onClose: () => void;
}

export const PlayerSettingsModal = ({ player, onClose }: PlayerSettingsModalProps) => {
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

  return (
    <ModalOverlay
      isOpen={true}
      onClose={onClose}
      backdrop="gradient"
      showCloseButton={true}
      closeButtonPosition="fixed"
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
    </ModalOverlay>
  );
};
