interface LifeDisplayProps {
  value: number;
  color?: string;
}

export const LifeDisplay = ({ value, color = '#ffffff' }: LifeDisplayProps) => {
  return (
    <div className="flex items-center justify-center h-full w-full">
      <span
        className="counter-value text-[18vmin] leading-none"
        style={{ color }}
      >
        {value}
      </span>
    </div>
  );
};
