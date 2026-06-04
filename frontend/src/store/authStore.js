/**
 * Auth Store — Zustand
 * Manages authentication state, user data, and token handling
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '../services';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isLoading: false,
      isInitialized: false,
      error: null,

      // Initialize auth state on app load
      initialize: async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          set({ isInitialized: true });
          return;
        }
        try {
          const { data } = await authService.getMe();
          set({ user: data.data, accessToken: token, isInitialized: true });
        } catch {
          // Token invalid or expired — try refresh
          try {
            const { data } = await authService.refreshToken();
            localStorage.setItem('accessToken', data.accessToken);
            set({ user: data.data, accessToken: data.accessToken, isInitialized: true });
          } catch {
            localStorage.removeItem('accessToken');
            set({ user: null, accessToken: null, isInitialized: true });
          }
        }
      },

      register: async (userData) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await authService.register(userData);
          set({ isLoading: false });
          return { success: true, message: data.message };
        } catch (err) {
          const message = err.response?.data?.message || 'Registration failed';
          set({ isLoading: false, error: message });
          return { success: false, message };
        }
      },

      login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await authService.login(credentials);
          localStorage.setItem('accessToken', data.accessToken);
          set({ user: data.data, accessToken: data.accessToken, isLoading: false, error: null });
          return { success: true };
        } catch (err) {
          const message = err.response?.data?.message || 'Login failed';
          set({ isLoading: false, error: message });
          return { success: false, message };
        }
      },

      logout: async () => {
        try {
          await authService.logout();
        } catch {
          // Ignore errors on logout
        }
        localStorage.removeItem('accessToken');
        set({ user: null, accessToken: null, error: null });
      },

      updateUser: (updates) => {
        set((state) => ({
          user: { ...state.user, ...updates },
        }));
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'musicnest-auth',
      partialize: (state) => ({ user: state.user }), // Only persist user data
    }
  )
);

export default useAuthStore;
