// Z-Index Layers (prevents conflicts)
export const Z_INDEX = {
  GESTURE_LAYER: 10,
  SECONDARY_COUNTER_BAR: 20,
  MODE_OVERLAY: 20, // Commander/DiceRoll overlays on player cards
  COUNTER_TOGGLE_MODAL: 40,
  FAB_BUTTON: 40,
  MODAL_OVERLAY: 50, // All full-screen modals
  CLOSE_BUTTON: 60,
} as const;

// Gesture Thresholds
export const SWIPE_THRESHOLD = 50;
export const LONG_PRESS_DELAY = 400;

// Timing Constants
export const DELTA_RESET_DELAY = 1500;
export const HIGHROLL_DURATION = 5000;
export const HIGHROLL_ANIMATION_INTERVAL = 80;
export const HIGHROLL_ANIMATION_FRAMES = 18;
export const COPY_FEEDBACK_DURATION = 2000;

// Animation Durations
export const ANIMATION = {
  OVERLAY_FADE: 0.2,
  CONTENT_SCALE: 0.15,
  SPRING_STIFFNESS: 500,
  SPRING_DAMPING: 25,
} as const;
