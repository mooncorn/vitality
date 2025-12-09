export interface GridConfig {
  cols: number;
  rows: number;
  areas?: string;
}

export const getGridConfig = (playerCount: number): GridConfig => {
  switch (playerCount) {
    case 1:
      return { cols: 1, rows: 1 };
    case 2:
      return { cols: 2, rows: 1 };
    case 3:
      return { cols: 4, rows: 2, areas: '"a a c c" "b b c c"' };
    case 4:
      return { cols: 2, rows: 2 };
    case 5:
      return { cols: 3, rows: 2, areas: '"a b e" "c d e"' };
    case 6:
      return { cols: 3, rows: 2 };
    default:
      return { cols: 2, rows: 2 };
  }
};

export const getGridAreaName = (index: number): string => {
  return String.fromCharCode(97 + index); // a, b, c, d, e, f
};

/**
 * Calculate automatic rotation for a player card based on position in grid.
 */
export const getAutoRotation = (
  playerIndex: number,
  playerCount: number
): number => {
  if (playerCount === 2) {
    // 2 cols x 1 row: left player faces right (90°), right player faces left (270°)
    return playerIndex === 0 ? 90 : 270;
  }

  if (playerCount === 3) {
    // Layout: a a c c
    //         b b c c
    // a (0): top-left, face up (180°)
    // b (1): bottom-left, face down (0°)
    // c (2): right side spanning, face right (270°)
    if (playerIndex === 0) return 180;
    if (playerIndex === 2) return 270;
    return 0;
  }

  if (playerCount === 4) {
    // 2 cols x 2 rows: indices 0,1 are top row, 2,3 are bottom row
    const isTopRow = playerIndex < 2;
    return isTopRow ? 180 : 0;
  }

  if (playerCount === 5) {
    // Layout: a b e
    //         c d e
    // a (0), b (1): top row, face up (180°)
    // c (2), d (3): bottom row, face down (0°)
    // e (4): right side spanning, face right (270°)
    if (playerIndex === 0 || playerIndex === 1) return 180;
    if (playerIndex === 4) return 270;
    return 0;
  }

  if (playerCount === 6) {
    // 3 cols x 2 rows: indices 0,1,2 are top row, 3,4,5 are bottom row
    const isTopRow = playerIndex < 3;
    return isTopRow ? 180 : 0;
  }

  return 0;
};
