import { X } from 'lucide-react';

interface CloseButtonProps {
  onClick: () => void;
  position?: 'fixed' | 'absolute';
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'p-2',
  md: 'p-3',
  lg: 'p-4',
};

const iconSizes = {
  sm: 16,
  md: 20,
  lg: 24,
};

export const CloseButton = ({
  onClick,
  position = 'absolute',
  size = 'md',
}: CloseButtonProps) => {
  const positionClasses = position === 'fixed'
    ? 'fixed top-4 right-4'
    : 'absolute top-3 right-3';

  return (
    <button
      className={`${positionClasses} z-50 ${sizeClasses[size]} rounded-full bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 transition-colors`}
      onClick={onClick}
    >
      <X size={iconSizes[size]} color="white" />
    </button>
  );
};
