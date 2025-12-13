import { useRef } from 'react';
import { useDrag } from '@use-gesture/react';
import { Swords } from 'lucide-react';
import { useHaptics } from '@/hooks/useHaptics';

const SWIPE_THRESHOLD = 50;

interface CommanderAttackerOverlayProps {
  color: string;
  backgroundColor: string;
  onExit: () => void;
  rotation?: number;
  isPortrait?: boolean;
}

export const CommanderAttackerOverlay = ({
  color,
  backgroundColor,
  onExit,
  rotation = 0,
  isPortrait = false,
}: CommanderAttackerOverlayProps) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const { mediumTap } = useHaptics();

  useDrag(
    ({ movement: [mx, my], last }) => {
      const totalRotation = (rotation + (isPortrait ? 90 : 0)) % 360;

      // Map screen movement to card-local horizontal movement
      let cardHorizontal: number;
      if (totalRotation === 90) {
        cardHorizontal = my;
      } else if (totalRotation === 270) {
        cardHorizontal = -my;
      } else if (totalRotation === 180) {
        cardHorizontal = -mx;
      } else {
        cardHorizontal = mx;
      }

      if (last && Math.abs(cardHorizontal) > SWIPE_THRESHOLD) {
        mediumTap();
        onExit();
      }
    },
    { target: overlayRef, filterTaps: true }
  );

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 z-20 flex flex-col items-center justify-center touch-none"
      style={{ backgroundColor }}
    >
      {/* Darkening overlay */}
      <div className="absolute inset-0 bg-black/50 pointer-events-none" />

      {/* Content */}
      <div className="relative flex flex-col items-center justify-center gap-4">
        <Swords size={24} color={color} />
        <span
          className="text-md font-semibold text-center"
          style={{ color, textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)' }}
        >
          Dealing Commander Damage
        </span>
        
      </div>
    </div>
  );
};
