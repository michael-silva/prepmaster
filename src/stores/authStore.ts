import { create } from "zustand";
import type { User } from "firebase/auth";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  authError: string | null;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setAuthError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  authError: null,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  setAuthError: (authError) => set({ authError }),
}));
