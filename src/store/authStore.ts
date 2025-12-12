// Auth store - manages authentication state
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types/multiplayer';

const API_BASE = import.meta.env.PROD ? '' : '';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  signIn: (provider: 'google') => Promise<void>;
  signOut: () => void;
  setAuth: (user: User, token: string) => void;
  clearError: () => void;
  checkPendingAuth: () => void;
}

export type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      token: null,
      isLoading: false,
      error: null,

      // Actions
      signIn: async (provider: 'google') => {
        set({ isLoading: true, error: null });

        try {
          // Open popup for OAuth
          const width = 500;
          const height = 600;
          const left = window.screenX + (window.outerWidth - width) / 2;
          const top = window.screenY + (window.outerHeight - height) / 2;

          const popup = window.open(
            `${API_BASE}/auth/${provider}/start`,
            'auth',
            `width=${width},height=${height},left=${left},top=${top},popup=1`
          );

          if (!popup) {
            throw new Error('Popup blocked. Please allow popups for this site.');
          }

          // Listen for message from popup
          const handleMessage = (event: MessageEvent) => {
            // Validate origin in production
            const data = event.data;

            if (data?.type === 'AUTH_SUCCESS') {
              window.removeEventListener('message', handleMessage);
              set({
                user: data.user,
                token: data.token,
                isLoading: false,
                error: null,
              });
            } else if (data?.type === 'AUTH_ERROR') {
              window.removeEventListener('message', handleMessage);
              set({
                isLoading: false,
                error: data.error || 'Authentication failed',
              });
            }
          };

          window.addEventListener('message', handleMessage);

          // Check if popup was closed without completing auth
          const checkClosed = setInterval(() => {
            if (popup.closed) {
              clearInterval(checkClosed);
              window.removeEventListener('message', handleMessage);
              const { user } = get();
              if (!user) {
                set({ isLoading: false });
              }
            }
          }, 500);

        } catch (err) {
          set({
            isLoading: false,
            error: err instanceof Error ? err.message : 'Authentication failed',
          });
        }
      },

      signOut: () => {
        set({
          user: null,
          token: null,
          error: null,
        });
      },

      setAuth: (user: User, token: string) => {
        set({ user, token, isLoading: false, error: null });
      },

      clearError: () => {
        set({ error: null });
      },

      // Check for pending auth from redirect flow (fallback for PWA)
      checkPendingAuth: () => {
        try {
          const pending = localStorage.getItem('vitality-auth-pending');
          if (pending) {
            localStorage.removeItem('vitality-auth-pending');
            const data = JSON.parse(pending);
            if (data.type === 'AUTH_SUCCESS') {
              set({
                user: data.user,
                token: data.token,
                isLoading: false,
                error: null,
              });
            }
          }
        } catch {
          // Ignore errors
        }
      },
    }),
    {
      name: 'vitality-auth',
      version: 1,
      partialize: (state) => ({
        user: state.user,
        token: state.token,
      }),
    }
  )
);

// Derived selectors
export const selectIsAuthenticated = (state: AuthStore) => !!state.user && !!state.token;
