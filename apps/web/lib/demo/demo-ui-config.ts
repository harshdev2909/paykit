/**
 * Demo page labels — must stay aligned with server-side demo policy hostnames where possible.
 * Prefer NEXT_PUBLIC_PAYKIT_API_URL hostname so production shows the real backend URL.
 */

import { getPaykitApiBaseUrlOrFallback } from "@/lib/paykit-client";

function sanitizeHost(raw: string): string {
  const noProto = raw.replace(/^https?:\/\//i, "").trim();
  const host = noProto.split("/")[0]?.trim();
  return host ?? "";
}

/** Chip next to “Allowed:” — backend API hostname (matches paid echo routes unless overridden). */
export function demoBackendHostnameLabel(): string {
  const explicit = process.env.NEXT_PUBLIC_DEMO_ALLOWED_HOST?.trim();
  if (explicit) {
    const h = sanitizeHost(explicit);
    if (h) return h;
  }
  try {
    return new URL(getPaykitApiBaseUrlOrFallback()).hostname;
  } catch {
    return "paykit-1.onrender.com";
  }
}
