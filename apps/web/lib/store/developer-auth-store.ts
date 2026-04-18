import { create } from "zustand";

interface DeveloperUser {
  id: string;
  email?: string;
  name?: string;
  provider?: string;
  plan: string;
}

interface DeveloperAuthState {
  token: string | null;
  user: DeveloperUser | null;
  setToken: (token: string | null) => void;
  setUser: (user: DeveloperUser | null) => void;
  logout: () => void;
}

/** OAuth JWT held in memory for this tab only (no localStorage). */
export const useDeveloperAuthStore = create<DeveloperAuthState>((set) => ({
  token: null,
  user: null,
  setToken: (token) => set({ token }),
  setUser: (user) => set({ user }),
  logout: () => set({ token: null, user: null }),
}));
