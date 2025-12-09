import { Check } from 'lucide-react';
import { MANA_COLORS } from '@/utils/colors';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export const ColorPicker = ({ value, onChange }: ColorPickerProps) => {
  const colors = Object.values(MANA_COLORS);

  return (
    <div className="grid grid-cols-5 gap-2">
      {colors.map(color => (
        <button
          key={color}
          className="w-10 h-10 rounded-lg border-2 flex items-center justify-center transition-transform hover:scale-110"
          style={{
            backgroundColor: color,
            borderColor: value.toUpperCase().startsWith(color.toUpperCase()) ? '#ffffff' : 'transparent',
          }}
          onClick={() => onChange(color)}
        >
          {value.toUpperCase().startsWith(color.toUpperCase()) && <Check size={16} color="white" />}
        </button>
      ))}
    </div>
  );
};
