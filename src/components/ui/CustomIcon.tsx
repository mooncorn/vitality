import type { LucideIcon } from 'lucide-react';

export interface IconConfig {
  className?: string;
  icon?: LucideIcon;
  text?: string;
}

interface CustomIconProps {
  config: IconConfig;
  size?: number;
  color?: string;
  fill?: string;
  style?: React.CSSProperties;
}

export const CustomIcon = ({ config, size = 16, color, fill, style }: CustomIconProps) => {
  if (config.className) {
    return (
      <i
        className={config.className}
        style={{
          fontSize: size,
          color,
          ...style,
        }}
      />
    );
  }

  if (config.icon) {
    const Icon = config.icon;
    return <Icon size={size} color={color} fill={fill} style={style} />;
  }

  if (config.text) {
    return (
      <span
        style={{
          fontSize: size,
          color,
          fontWeight: 'bold',
          lineHeight: 1,
          ...style,
        }}
      >
        {config.text}
      </span>
    );
  }

  return null;
};
