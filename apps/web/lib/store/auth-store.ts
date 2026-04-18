import { create } from "zustand";

/** Merchant API key for dashboard API calls — in-memory only (no localStorage per product guardrails). */
interface AuthState {
  apiKey: string | null;
  setApiKey: (key: string | null) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  apiKey: null,
  setApiKey: (key) => set({ apiKey: key }),
  clearAuth: () => set({ apiKey: null }),
}));
