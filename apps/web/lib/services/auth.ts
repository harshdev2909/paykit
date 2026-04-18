import { useAuthStore } from "@/lib/store/auth-store";

/** Read current merchant API key from in-memory store (dashboard session). */
export function getStoredApiKey(): string | null {
  return useAuthStore.getState().apiKey;
}

export function setStoredApiKey(key: string): void {
  useAuthStore.getState().setApiKey(key);
}

export function clearStoredApiKey(): void {
  useAuthStore.getState().clearAuth();
}

export function hasApiKey(): boolean {
  const key = useAuthStore.getState().apiKey;
  return !!key && key.length > 0;
}
