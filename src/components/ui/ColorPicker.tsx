import { Check } from 'lucide-react';
import { MANA_COLORS } from '@/utils/colors';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

const normalizeHex = (hex: string): string => {
  return hex.toUpperCase().slice(0, 7);
};

export const ColorPicker = ({ value, onChange }: ColorPickerProps) => {
  const colors = Object.values(MANA_COLORS);

  const isPresetSelected = (color: string) => {
    return normalizeHex(value) === normalizeHex(color);
  };

  return (
    <div className="grid grid-cols-6 gap-2">
      {colors.map(color => (
        <button
          key={color}
          className="w-10 h-10 rounded-lg border-2 flex items-center justify-center transition-transform hover:scale-110"
          style={{
            backgroundColor: color,
            borderColor: isPresetSelected(color) ? '#ffffff' : 'transparent',
          }}
          onClick={() => onChange(color)}
        >
          {isPresetSelected(color) && <Check size={16} color="white" />}
        </button>
      ))}
    </div>
  );
};
