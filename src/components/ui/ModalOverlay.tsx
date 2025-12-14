import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CloseButton } from './CloseButton';

interface ModalOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  backdrop?: 'blur' | 'dark' | 'gradient';
  portal?: boolean;
  showCloseButton?: boolean;
  closeButtonPosition?: 'fixed' | 'absolute';
  className?: string;
  contentClassName?: string;
}

const backdropClasses = {
  blur: 'bg-black/60 backdrop-blur-sm',
  dark: 'bg-black/70 backdrop-blur-md',
  gradient: 'bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900',
};

export const ModalOverlay = ({
  isOpen,
  onClose,
  children,
  backdrop = 'gradient',
  portal = true,
  showCloseButton = true,
  closeButtonPosition = 'fixed',
  className = '',
  contentClassName = '',
}: ModalOverlayProps) => {
  const content = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={`fixed inset-0 z-50 flex items-center justify-center ${className}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, pointerEvents: 'none' as const }}
          transition={{ duration: 0.15 }}
          onClick={backdrop !== 'gradient' ? onClose : undefined}
        >
          {/* Backdrop */}
          <div className={`absolute inset-0 ${backdropClasses[backdrop]}`} />

          {/* Close button */}
          {showCloseButton && (
            <CloseButton
              onClick={onClose}
              position={closeButtonPosition}
              size="md"
            />
          )}

          {/* Content */}
          <motion.div
            className={`relative z-10 p-6 mx-4 max-w-sm w-full max-h-[85vh] overflow-y-auto ${contentClassName}`}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={e => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (portal) {
    return createPortal(content, document.body);
  }

  return content;
};
