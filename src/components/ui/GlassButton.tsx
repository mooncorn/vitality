import { Loader2 } from 'lucide-react';

interface GlassButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'primary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'py-2 gap-1',
  md: 'py-4 gap-2',
  lg: 'py-5 gap-3',
};

const textSizes = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

const variantClasses = {
  default: 'bg-white/10 border-white/20 hover:bg-white/20 text-white',
  primary: 'bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20 text-blue-400',
  danger: 'bg-red-500/10 border-red-500/20 hover:bg-red-500/20 text-red-400',
};

export const GlassButton = ({
  icon,
  label,
  onClick,
  variant = 'default',
  disabled = false,
  loading = false,
  size = 'md',
}: GlassButtonProps) => {
  const baseClasses = 'w-full rounded-xl backdrop-blur-md border transition-all duration-200 flex flex-col items-center justify-center';

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${
        disabled || loading ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? <Loader2 className="animate-spin" size={20} /> : icon}
      <span className={`${textSizes[size]} font-medium`}>{label}</span>
    </button>
  );
};
