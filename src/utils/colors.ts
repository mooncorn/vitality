export const MANA_COLORS = {
  white: '#967a00ce',
  green: '#008d47c7',
  blue: '#002a96ff',
  red: '#af00299a',
  black: '#1F1F1F',
};

export type ManaColor = keyof typeof MANA_COLORS;

export const MANA_COLOR_LIST = Object.keys(MANA_COLORS) as ManaColor[];

export const COLOR_TEXTURES: Record<ManaColor, string> = {
  white: '/img/yellow_bg.jpg',
  green: '/img/green_bg.jpg',
  blue: '/img/blue_bg.jpg',
  red: '/img/red_bg.jpg',
  black: '/img/black_bg.jpg',
};

export const getColorPreset = (index: number): string => {
  const colors = Object.values(MANA_COLORS);
  return colors[index % colors.length];
};

export const getTextureForColor = (color: string): string => {
  // Normalize to 7 chars (#RRGGBB) for comparison, stripping alpha if present
  const normalizedInput = color.toUpperCase().slice(0, 7);
  const manaColor = MANA_COLOR_LIST.find(
    key => MANA_COLORS[key].toUpperCase().slice(0, 7) === normalizedInput
  );
  return manaColor ? COLOR_TEXTURES[manaColor] : '/img/texture.jpg';
};

export const isLightColor = (hex: string): boolean => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
};
