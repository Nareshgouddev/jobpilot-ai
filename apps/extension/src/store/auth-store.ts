import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  userId: string | null;
  email: string | null;
  accessToken: string | null;
  expiresAt: number | null;

  setAuth: (payload: {
    userId: string;
    email: string;
    accessToken: string;
    expiresInSeconds: number;
  }) => void;

  clearAuth: () => void;

  isTokenValid: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      userId: null,
      email: null,
      accessToken: null,
      expiresAt: null,

      setAuth: (payload) => {
        const expiresAt = Date.now() + payload.expiresInSeconds * 1000;
        set({
          userId: payload.userId,
          email: payload.email,
          accessToken: payload.accessToken,
          expiresAt
        });
      },

      clearAuth: () => {
        set({
          userId: null,
          email: null,
          accessToken: null,
          expiresAt: null
        });
      },

      isTokenValid: () => {
        const state = get();
        if (!state.accessToken || !state.expiresAt) return false;
        return Date.now() < state.expiresAt - 60000; // 1 min buffer
      }
    }),
    {
      name: "jobpilot.auth"
    }
  )
);
