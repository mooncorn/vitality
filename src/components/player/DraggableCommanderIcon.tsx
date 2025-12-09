import { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sword } from 'lucide-react';
import { createPortal } from 'react-dom';
import { CommanderDamageModal } from '@/components/commander/CommanderDamageModal';

interface DraggableCommanderIconProps {
  playerId: string;
  color?: string;
  isSideways?: boolean;
}

export const DraggableCommanderIcon = ({
  playerId,
  color = '#ffffff',
  isSideways = false,
}: DraggableCommanderIconProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    targetPlayerId: string | null;
  }>({ isOpen: false, targetPlayerId: null });

  const iconRef = useRef<HTMLDivElement>(null);
  const startPositionRef = useRef({ x: 0, y: 0 });

  const findTargetPlayer = useCallback(
    (clientX: number, clientY: number): string | null => {
      const elements = document.elementsFromPoint(clientX, clientY);
      for (const el of elements) {
        const playerCard = el.closest('[data-player-id]');
        if (playerCard) {
          const targetId = playerCard.getAttribute('data-player-id');
          if (targetId && targetId !== playerId) {
            return targetId;
          }
        }
      }
      return null;
    },
    [playerId]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const rect = iconRef.current?.getBoundingClientRect();
      if (rect) {
        startPositionRef.current = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        };
        setDragPosition({ x: e.clientX, y: e.clientY });
        setIsDragging(true);
      }
    },
    []
  );

  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e: PointerEvent) => {
      setDragPosition({ x: e.clientX, y: e.clientY });
    };

    const handlePointerUp = (e: PointerEvent) => {
      const targetPlayerId = findTargetPlayer(e.clientX, e.clientY);
      setIsDragging(false);

      if (targetPlayerId) {
        setModalState({ isOpen: true, targetPlayerId });
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, findTargetPlayer]);

  const handleCloseModal = useCallback(() => {
    setModalState({ isOpen: false, targetPlayerId: null });
  }, []);

  return (
    <>
      {/* Static icon */}
      <div
        ref={iconRef}
        className="absolute p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-30 cursor-grab active:cursor-grabbing touch-none"
        style={{
          bottom: isSideways ? '8px' : '12px',
          right: isSideways ? '8px' : '12px',
        }}
        onPointerDown={handlePointerDown}
      >
        <Sword size={20} color={color} />
      </div>

      {/* Dragging indicator */}
      {isDragging &&
        createPortal(
          <motion.div
            className="fixed pointer-events-none z-50"
            initial={{ scale: 1 }}
            animate={{ scale: 1.2 }}
            style={{
              left: dragPosition.x - 20,
              top: dragPosition.y - 20,
            }}
          >
            <div className="p-2 rounded-full bg-white/30 backdrop-blur-sm">
              <Sword size={24} color={color} />
            </div>
          </motion.div>,
          document.body
        )}

      {/* Commander damage modal */}
      {modalState.isOpen && modalState.targetPlayerId && (
        <CommanderDamageModal
          sourcePlayerId={playerId}
          targetPlayerId={modalState.targetPlayerId}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
};
