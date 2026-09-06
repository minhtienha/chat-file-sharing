import { create } from 'zustand';

export interface User {
  _id: string;
  name: string;
  email: string;
}

interface AuthState {
  accessToken: string | null;
  user: User | null;

  setToken: (token: string) => void;
  setUser: (user: User) => void;
  clearAuth: () => void;
}

export const useBearerTokenStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,

  setToken: (token) => set({ accessToken: token }),

  setUser: (user) => set({ user }),

  clearAuth: () =>
    set({
      accessToken: null,
      user: null,
    }),
}));
