/** Build-time sanity: GET /v1/x402/supported when public API URL is configured. */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const base = process.env.NEXT_PUBLIC_PAYKIT_API_URL?.replace(/\/$/, "");
    if (!base) {
      console.warn("[paykit] Public API URL unset — skipping sanity check");
      return;
    }
    try {
      const url = `${base}/v1/x402/supported`;
      const res = await fetch(url, { next: { revalidate: 0 } });
      const body = await res.text();
      console.log(`[paykit] build sanity GET /v1/x402/supported → ${res.status} ${body.slice(0, 120)}…`);
    } catch (err) {
      console.warn("[paykit] build sanity fetch failed:", err);
    }
  }
}
