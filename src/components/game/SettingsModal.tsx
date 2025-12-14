import { X, Heart } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { ModalOverlay } from '@/components/ui/ModalOverlay';
import type { GameSettings } from '@/types';

interface SettingsModalProps {
  onClose: () => void;
}

const STARTING_LIFE_OPTIONS: GameSettings['startingLife'][] = [20, 30, 40];

export const SettingsModal = ({ onClose }: SettingsModalProps) => {
  const settings = useGameStore(state => state.settings);
  const updateSettings = useGameStore(state => state.updateSettings);

  const handleStartingLifeChange = (life: GameSettings['startingLife']) => {
    updateSettings({ startingLife: life });
  };

  return (
    <ModalOverlay
      isOpen={true}
      onClose={onClose}
      backdrop="blur"
      showCloseButton={false}
      contentClassName="glass-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-white text-lg font-semibold">Game Settings</h2>
        <button
          className="p-1 rounded-full hover:bg-white/10 transition-colors"
          onClick={onClose}
        >
          <X size={20} color="white" />
        </button>
      </div>

      {/* Starting life */}
      <div className="mb-6">
        <label className="text-white/70 text-sm mb-2 flex items-center gap-2">
          <Heart size={16} />
          Starting Life
        </label>
        <div className="flex gap-2">
          {STARTING_LIFE_OPTIONS.map(life => (
            <button
              key={life}
              className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                settings.startingLife === life
                  ? 'bg-white/30 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
              onClick={() => handleStartingLifeChange(life)}
            >
              {life}
            </button>
          ))}
        </div>
        <p className="text-white/40 text-xs mt-2">
          Changes apply on next game reset
        </p>
      </div>
    </ModalOverlay>
  );
};
