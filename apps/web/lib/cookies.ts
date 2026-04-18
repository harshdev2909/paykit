/** Client-only cookie helpers for persistent UI (e.g. docs code tab). */

const YEAR_SEC = 60 * 60 * 24 * 365;

export function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const m = document.cookie.match(
    new RegExp(`(?:^|; )${name.replace(/[.$?*|{}()[\]\\/+^]/g, "\\$&")}=([^;]*)`),
  );
  return m?.[1] ? decodeURIComponent(m[1]) : undefined;
}

export function setCookie(name: string, value: string, maxAgeSec = YEAR_SEC): void {
  if (typeof document === "undefined") return;
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSec}; SameSite=Lax`;
}
