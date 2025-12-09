import { useState, useCallback, useRef, useEffect } from 'react';
import { Settings, ShieldHalf, Zap, Sparkle } from 'lucide-react';
import { useMotionValue } from 'framer-motion';
import type { Player } from '@/types';
import { useGameStore } from '@/store/gameStore';
import { useHaptics } from '@/hooks/useHaptics';
import { useForceLandscape } from '@/hooks/useForceLandscape';
import { getTextureForColor } from '@/utils/colors';
import { CounterSlider } from './CounterSlider';
import { ControlOverlay } from './ControlOverlay';
import { DraggableCommanderIcon } from './DraggableCommanderIcon';
import { PlayerOverlay } from './PlayerOverlay';

interface PlayerCardProps {
  player: Player;
  rotation?: number;
}

const DELTA_RESET_DELAY = 1500;

const secondaryCounterIcons = {
  poison: ShieldHalf,
  energy: Zap,
  experience: Sparkle,
} as const;

const SecondaryCounters = ({ player }: { player: Player }) => {
  const counters = player.counters.filter(
    (c) => c.type !== 'life' && c.type !== 'commander' && c.value !== 0
  );

  if (counters.length === 0) return null;

  return (
    <div className="flex flex-col gap-1 mt-1 opacity-60">
      {counters.map((counter) => {
        const Icon = secondaryCounterIcons[counter.type as keyof typeof secondaryCounterIcons];
        if (!Icon) return null;
        return (
          <div key={counter.id} className="flex items-center gap-0.5 text-xs">
            <Icon size={10} />
            <span>{counter.value}</span>
          </div>
        );
      })}
    </div>
  );
};

export const PlayerCard = ({ player, rotation = 0 }: PlayerCardProps) => {
  const [showOverlay, setShowOverlay] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [accumulatedDelta, setAccumulatedDelta] = useState(0);
  const deltaTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const updateCounter = useGameStore(state => state.updateCounter);
  const setActiveCounter = useGameStore(state => state.setActiveCounter);
  const { lightTap } = useHaptics();
  const isPortrait = useForceLandscape();
  const dragOffset = useMotionValue(0);

  const currentCounter = player.counters[player.activeCounterIndex];

  // Measure container dimensions
  useEffect(() => {
    const updateDimensions = () => {
      if (cardRef.current) {
        setDimensions({
          width: cardRef.current.offsetWidth,
          height: cardRef.current.offsetHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const handleIncrement = useCallback(
    (delta: number) => {
      updateCounter(player.id, currentCounter.type, delta);

      // Accumulate delta for display
      setAccumulatedDelta(prev => prev + delta);

      // Reset timeout
      if (deltaTimeoutRef.current) {
        clearTimeout(deltaTimeoutRef.current);
      }
      deltaTimeoutRef.current = setTimeout(() => {
        setAccumulatedDelta(0);
      }, DELTA_RESET_DELAY);
    },
    [player.id, currentCounter.type, updateCounter]
  );

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (deltaTimeoutRef.current) {
        clearTimeout(deltaTimeoutRef.current);
      }
    };
  }, []);

  // For 90° or 270° rotation, we need to swap width and height
  const isSideways = rotation === 90 || rotation === 270;

  const innerStyle: React.CSSProperties = isSideways
    ? {
        position: 'absolute',
        top: '50%',
        left: '50%',
        // Swap dimensions: use container height as width, container width as height
        width: dimensions.height,
        height: dimensions.width,
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
      }
    : {
        width: '100%',
        height: '100%',
        transform: `rotate(${rotation}deg)`,
      };

  return (
    <div
      ref={cardRef}
      className="relative h-full w-full overflow-hidden"
      data-player-id={player.id}
    >
      {/* Blurred texture background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${getTextureForColor(player.theme.backgroundColor)})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(4px)',
          transform: `rotate(${rotation}deg)`,
        }}
      />
      {/* Color overlay */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: player.theme.backgroundColor, opacity: 0.8 }}
      />
      <div style={innerStyle}>
        {/* Counter display */}
        <CounterSlider
          counters={player.counters}
          activeIndex={player.activeCounterIndex}
          color={player.theme.primaryColor}
          delta={accumulatedDelta}
          dragOffset={dragOffset}
        />

        {/* Touch zones for +/- and swipe */}
        <ControlOverlay
          onIncrement={handleIncrement}
          rotation={rotation}
          isPortrait={isPortrait}
          canGoNext={player.activeCounterIndex < player.counters.length - 1}
          canGoPrev={player.activeCounterIndex > 0}
          onSwipeNext={() => setActiveCounter(player.id, player.activeCounterIndex + 1)}
          onSwipePrev={() => setActiveCounter(player.id, player.activeCounterIndex - 1)}
          onBoundaryHit={lightTap}
          dragOffset={dragOffset}
        />

        {/* Settings button */}
        <button
          className="absolute p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-30"
          style={{
            top: isSideways ? '8px' : '12px',
            right: isSideways ? '8px' : '12px',
          }}
          onClick={() => setShowOverlay(true)}
        >
          <Settings size={20} color={player.theme.primaryColor} />
        </button>

        {/* Commander damage drag icon */}
        <DraggableCommanderIcon
          playerId={player.id}
          color={player.theme.primaryColor}
          isSideways={isSideways}
        />

        {/* Player name and secondary counters */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: isSideways ? '8px' : '12px',
            left: isSideways ? '8px' : '12px',
            color: player.theme.primaryColor,
          }}
        >
          <div className="text-sm font-medium opacity-70">{player.name}</div>
          <SecondaryCounters player={player} />
        </div>
      </div>

      {/* Settings overlay */}
      {showOverlay && (
        <PlayerOverlay
          player={player}
          onClose={() => setShowOverlay(false)}
        />
      )}
    </div>
  );
};
