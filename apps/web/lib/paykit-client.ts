/**
 * Single source for PayKit HTTP API URLs and fetch helpers (server + client).
 */

/** Deployed HTTP API hostname (used only when env is unset). */
export const FALLBACK_PAYKIT_PUBLIC_API = "https://paykit-1.onrender.com";

export function getPaykitApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_PAYKIT_API_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  return "";
}

export function getPaykitApiBaseUrlOrFallback(): string {
  return getPaykitApiBaseUrl() || FALLBACK_PAYKIT_PUBLIC_API.replace(/\/$/, "");
}

/** True when Vercel / runtime has configured the public API URL. */
export function isPaykitApiConfigured(): boolean {
  return !!getPaykitApiBaseUrl();
}

export function paykitApiUrl(path: string): string {
  const base = getPaykitApiBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  if (!base) return p;
  return `${base}${p}`;
}

export type PaykitFetchInit = Omit<RequestInit, "headers"> & {
  headers?: HeadersInit;
  /** Sends `x-api-key` (client routes can pass merchant key from session). */
  apiKey?: string | null;
};

export async function paykitFetch(path: string, init: PaykitFetchInit = {}): Promise<Response> {
  const { apiKey, ...rest } = init;
  const headers = new Headers(rest.headers ?? undefined);
  if (!headers.has("Content-Type") && rest.body != null && typeof rest.body === "string") {
    headers.set("Content-Type", "application/json");
  }
  if (apiKey) headers.set("x-api-key", apiKey);
  return fetch(paykitApiUrl(path), { ...rest, headers });
}

export async function paykitFetchJson<T>(path: string, init?: PaykitFetchInit): Promise<T> {
  const res = await paykitFetch(path, init);
  const text = await res.text();
  if (!res.ok) {
    throw new Error(text || `HTTP ${res.status}`);
  }
  return text ? (JSON.parse(text) as T) : ({} as T);
}

/** SSE URL for EventSource — browser cannot set headers; prefer Next.js proxy routes that attach the key server-side. */
export function paykitEventsStreamAbsoluteUrl(): string {
  return `${getPaykitApiBaseUrl()}/events/stream`;
}
