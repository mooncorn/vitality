import { useState, useCallback, useRef, useEffect } from 'react';
import type { Player, CounterType } from '@/types';
import { useGameStore } from '@/store/gameStore';
import { useHaptics } from '@/hooks/useHaptics';
import { useForceLandscape } from '@/hooks/useForceLandscape';
import { CounterSlider } from './CounterSlider';
import { ControlOverlay } from './ControlOverlay';
import { PlayerOverlay } from './PlayerOverlay';
import { CounterToggleOverlay } from './CounterToggleOverlay';
import { EnabledCountersDisplay } from './EnabledCountersDisplay';
import { CommanderTargetOverlay } from '../commander/CommanderTargetOverlay';
import { CommanderAttackerOverlay } from '../commander/CommanderAttackerOverlay';

interface PlayerCardProps {
  player: Player;
  rotation?: number;
}

const DELTA_RESET_DELAY = 1500;

export const PlayerCard = ({ player, rotation = 0 }: PlayerCardProps) => {
  const [showOverlay, setShowOverlay] = useState(false);
  const [showCounterToggle, setShowCounterToggle] = useState(false);
  const [selectedCounter, setSelectedCounter] = useState<CounterType | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [accumulatedDelta, setAccumulatedDelta] = useState(0);
  const deltaTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const updateCounter = useGameStore(state => state.updateCounter);
  const commanderAttackMode = useGameStore(state => state.commanderAttackMode);
  const enterCommanderAttackMode = useGameStore(state => state.enterCommanderAttackMode);
  const exitCommanderAttackMode = useGameStore(state => state.exitCommanderAttackMode);
  const updateCommanderDamage = useGameStore(state => state.updateCommanderDamage);
  const { lightTap, mediumTap } = useHaptics();
  const isPortrait = useForceLandscape();

  // Commander attack mode state
  const isAttacker = commanderAttackMode.isActive && commanderAttackMode.attackingPlayerId === player.id;
  const isTarget = commanderAttackMode.isActive && commanderAttackMode.attackingPlayerId !== player.id;
  const commanderDamageFromAttacker = commanderAttackMode.attackingPlayerId
    ? player.commanderDamage[commanderAttackMode.attackingPlayerId] || 0
    : 0;

  // Get the current counter to display (life by default, or selected secondary counter)
  const currentCounterType = selectedCounter || 'life';
  const currentCounter = player.counters.find(c => c.type === currentCounterType) || player.counters[0];

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

  // Reset accumulated delta when switching counters
  useEffect(() => {
    setAccumulatedDelta(0);
  }, [selectedCounter]);

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

  const handleSelectCounter = useCallback((counterType: CounterType | null) => {
    setSelectedCounter(counterType);
    lightTap();
  }, [lightTap]);

  // Handle horizontal swipe to toggle commander attack mode
  const handleHorizontalSwipe = useCallback(() => {
    if (commanderAttackMode.isActive) {
      // Only the attacker can exit the mode
      if (isAttacker) {
        exitCommanderAttackMode();
        mediumTap();
      }
    } else {
      // Enter commander attack mode with this player as the attacker
      enterCommanderAttackMode(player.id, rotation);
      mediumTap();
    }
  }, [commanderAttackMode.isActive, isAttacker, player.id, rotation, enterCommanderAttackMode, exitCommanderAttackMode, mediumTap]);

  // Handle commander damage increment when this card is a target
  const handleCommanderDamage = useCallback((delta: number) => {
    if (isTarget && commanderAttackMode.attackingPlayerId) {
      updateCommanderDamage(player.id, commanderAttackMode.attackingPlayerId, delta);
      // Commander damage also affects life (positive damage = negative life)
      updateCounter(player.id, 'life', -delta);
    }
  }, [isTarget, commanderAttackMode.attackingPlayerId, player.id, updateCommanderDamage, updateCounter]);

  return (
    <div
      ref={cardRef}
      className="relative h-full w-full overflow-hidden rounded-md"
      data-player-id={player.id}
    >
      {/* Background */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: player.theme.backgroundColor }}
      />
      <div style={innerStyle}>
        {/* Counter display */}
        <CounterSlider
          counter={currentCounter}
          color={player.theme.primaryColor}
          delta={accumulatedDelta}
        />

        {/* Touch zones for +/- and swipe */}
        <ControlOverlay
          onIncrement={handleIncrement}
          rotation={rotation}
          isPortrait={isPortrait}
          onVerticalSwipeUp={() => setShowCounterToggle(true)}
          onVerticalSwipeDown={() => setShowOverlay(true)}
          onHorizontalSwipe={handleHorizontalSwipe}
        />

        {/* Commander attacker overlay */}
        {isAttacker && (
          <CommanderAttackerOverlay
            color={player.theme.primaryColor}
            backgroundColor={player.theme.backgroundColor}
            onExit={exitCommanderAttackMode}
            rotation={rotation}
            isPortrait={isPortrait}
          />
        )}

        {/* Commander target overlay */}
        {isTarget && (
          <CommanderTargetOverlay
            commanderDamage={commanderDamageFromAttacker}
            color={player.theme.primaryColor}
            backgroundColor={player.theme.backgroundColor}
            onDealDamage={handleCommanderDamage}
            attackerRotation={commanderAttackMode.attackerRotation}
            targetRotation={rotation}
          />
        )}

        {/* Enabled secondary counters at bottom (hidden in commander attack mode) */}
        {!isTarget && !isAttacker && (
          <EnabledCountersDisplay
            player={player}
            selectedCounter={selectedCounter}
            onSelectCounter={handleSelectCounter}
            isSideways={isSideways}
          />
        )}

        {/* Player name */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: isSideways ? '8px' : '12px',
            left: isSideways ? '8px' : '12px',
            color: player.theme.primaryColor,
          }}
        >
          <div className="text-sm font-medium opacity-70">{player.name}</div>
        </div>

        {/* Counter toggle overlay */}
        <CounterToggleOverlay
          player={player}
          isOpen={showCounterToggle}
          onClose={() => setShowCounterToggle(false)}
        />
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
