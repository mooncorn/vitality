export const MANA_COLORS = {
  white: '#bb9900ff',
  green: '#008d47c7',
  blue: '#002a96ff',
  red: '#b80000ff',
  black: '#1F1F1F',
  purple: '#7B2D8E',
};

export type ManaColor = keyof typeof MANA_COLORS;

export const MANA_COLOR_LIST = Object.keys(MANA_COLORS) as ManaColor[];

export const getColorPreset = (index: number): string => {
  const colors = Object.values(MANA_COLORS);
  return colors[index % colors.length];
};

export const isLightColor = (hex: string): boolean => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
};
