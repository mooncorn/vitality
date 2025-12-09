Project Title: Vitality (Life Counter PWA)
Goal: Create a highly responsive, offline-capable Progressive Web App (PWA) for tracking tabletop game states (Magic: The Gathering, etc.). The app focuses on gesture-based interactions, minimalist design, and deep customization.

1. Technical Stack
Framework: React 18+ (Functional Components, Hooks)

Build Tool: Vite (Fast HMR, optimized build)

Language: TypeScript (Strict mode)

Styling: Tailwind CSS (Utility-first, ease of theming)

State Management: Zustand (Lightweight, ideal for local game state) or React Context.

Animations/Gestures: Framer Motion (Animations) + React UseGesture (Swipe/Slide interactions).

PWA: vite-plugin-pwa (Manifest generation, Service Worker for offline support).

Icons: Lucide-React (Clean, consistent stroke icons).

Storage: localStorage (Persist game state across reloads).

2. Core Features & Functional Requirements
A. The Player Grid (Home Screen)
Dynamic Layout: Automatically adjusts the grid based on the number of players (1–6 players).

2 Players: Split screen (Top/Bottom or Left/Right).

4 Players: 2x2 Grid.

Odd numbers: Intelligent grid filling (e.g., 3 players = 1 top, 2 bottom).

Orientation: Supports both Portrait and Landscape (rotates player cards specifically for players sitting across the table).

B. The Player Card (Component)
Each section of the grid is a "Player Card" containing:

Life Total: Large, centered typography.

Interaction:

Tap Left/Right: Decrease/Increase life by 1.

Hold Left/Right: Continuously decrease/increase or +/- 10.

Vertical Slide (The "Shutter" Effect): Swiping up/down on the card transitions the view from Life Total to Secondary Counters (Commander Damage, Poison, Energy, etc.).

Visuals: Custom background color/gradient per player.

C. Customization & Settings
Player Settings (accessible via long-press or gear icon):

Change Name.

Change Color (Preset palettes + Color Picker).

Change Background Image (URL or preset patterns).

Game Settings:

Starting Life Total (20, 30, 40).

Reset Game.

Toggle Screen Wake Lock (Keep screen on).

3. Data Architecture (TypeScript Interfaces)
TypeScript

// types.ts

export type CounterType = 'life' | 'poison' | 'energy' | 'commander' | 'experience';

export interface PlayerTheme {
  primaryColor: string; // Used for text/icons
  backgroundColor: string; // Used for card background
  rotation: number; // 0, 90, 180, 270 (for table seating)
}

export interface CounterState {
  id: string;
  type: CounterType;
  value: number;
  label?: string; // Optional custom label
  icon?: string; // Icon identifier
}

export interface Player {
  id: string;
  name: string;
  theme: PlayerTheme;
  counters: CounterState[]; // Array to hold Life + other counters
  activeCounterIndex: number; // Which counter is currently displayed (0 is usually Life)
}

export interface GameState {
  players: Player[];
  settings: {
    startingLife: number;
    allowSleep: boolean;
  };
  // Actions
  addPlayer: () => void;
  removePlayer: (id: string) => void;
  updatePlayerLife: (id: string, delta: number) => void;
  setPlayerTheme: (id: string, theme: Partial<PlayerTheme>) => void;
  resetGame: () => void;
}
4. UI/UX Design Guidelines
Visual Style
Glassmorphism: Use slight transparency on overlay menus (settings, counters) to keep context of the game board visible.

Typography: Sans-serif, bold, monospaced for numbers (to prevent jitter when numbers change).

Contrast: High contrast is mandatory. White text on dark/colored backgrounds.

Feedback: Visual ripple effect on tap. Haptic feedback (vibration) on value change (if device supports it).

Iconography Strategy
Strictly Icons: Avoid text labels where possible.

Heart: Life

Skull: Poison

Shield: Commander Damage

Gear: Settings

Rotate: Flip card orientation

5. Component Hierarchy
AppLayout: Handles full-screen height, PWA install prompts, and global settings button (center overlay).

PlayerGrid: CSS Grid container calculating dimensions based on players.length.

PlayerCard:

LifeDisplay: The main number view.

CounterSlider: Wrapper handling the vertical drag gesture (Framer Motion AnimatePresence).

ControlOverlay: Invisible touch zones for +/- interactions.

PlayerMenu: Modal for editing name/color.

GlobalMenu: Center floating button (FAB) for resetting game or changing player count.

6. Implementation Details: The Vertical Slide
To achieve the "Slide Vertically" to switch counters, use Framer Motion variants.

State: Each player has an activeView index.

Gesture: Detect onPan or useDrag.

Logic:

Drag Up: Switch to next counter (e.g., Life -> Commander Dmg).

Drag Down: Switch to previous counter.

Animation: The current number slides out (opacity 0, y: -50), the new number slides in (opacity 1, y: 0).

7. PWA Configuration (vite.config.ts)
Ensure the app is installable and looks like a native app.

TypeScript

import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Vitality Life Counter',
        short_name: 'Vitality',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone', // Removes browser UI
        orientation: 'any',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          // ... 512x512
        ]
      }
    })
  ]
})
8. Deliverables Checklist
[ ] Scaffold: Vite + React + TS setup.

[ ] Store: Zustand store configured with persistence.

[ ] Grid Logic: CSS Grid that handles 1-6 players gracefully.

[ ] Gesture Card: Component allowing tap-to-change and slide-to-switch.

[ ] Customization: Modal to pick colors/names.

[ ] Assets: Generate PWA icons and manifest.