"use client";

import { useAuthStore } from "@/lib/store/auth-store";

export function useApiKey() {
  return useAuthStore((s) => s.apiKey);
}
