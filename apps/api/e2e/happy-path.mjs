#!/usr/bin/env node
/**
 * Integration check: health → x402 supported → verify → settle → list receipts.
 * Requires a real merchant API key (Mongo) and Postgres for receipts.
 *
 * Usage:
 *   E2E_API_KEY=pk_... E2E_BASE_URL=http://127.0.0.1:3000 node e2e/happy-path.mjs
 *
 * Optional:
 *   E2E_AGENT_WALLET=1 — also POST /v1/wallets (Friendbot on Stellar testnet; needs WALLET_ENCRYPTION_KEY on server)
 */

const BASE = process.env.E2E_BASE_URL ?? process.env.PAYKIT_E2E_URL ?? "http://127.0.0.1:3000";
const API_KEY = process.env.E2E_API_KEY ?? process.env.PAYKIT_E2E_API_KEY;

/** Valid Stellar account IDs (checksum-verified; arbitrary testnet addresses) */
const WALLET_FROM = "GB6HI6XJ5IRC5WXD7A2XK53YEE2UYFD2FE4TR46EKZQH5GUJBKOYEUVD";
const WALLET_TO = "GBAN7SR2J7IPNN6JETG3AAUQN3PAJ4NOMLOHIYIOLSTHIFFUCV4TSW55";

async function main() {
  if (!API_KEY) {
    console.log("E2E skipped: set E2E_API_KEY to a merchant API key (see DEMO_SCRIPT.md).");
    process.exit(0);
  }

  const headers = {
    "Content-Type": "application/json",
    "x-api-key": API_KEY,
  };

  let r = await fetch(`${BASE}/health`);
  if (!r.ok) throw new Error(`GET /health → ${r.status}`);
  console.log("ok  GET /health");

  r = await fetch(`${BASE}/v1/x402/supported`);
  if (!r.ok) throw new Error(`GET /v1/x402/supported → ${r.status}`);
  await r.json();
  console.log("ok  GET /v1/x402/supported");

  r = await fetch(`${BASE}/v1/x402/verify`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      paymentHeader: "dGVzdA==",
      resource: "https://example.com/resource",
      domain: "example.com",
    }),
  });
  if (!r.ok) throw new Error(`POST /v1/x402/verify → ${r.status} ${await r.text()}`);
  const verify = await r.json();
  if (!verify.valid) throw new Error("verify: expected valid=true for base64 payload");
  console.log("ok  POST /v1/x402/verify");

  r = await fetch(`${BASE}/v1/x402/settle`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      walletFrom: WALLET_FROM,
      walletTo: WALLET_TO,
      asset: "native",
      amount: "1000000",
      domain: "example.com",
      path: "/demo",
      x402Nonce: `e2e-${Date.now()}`,
    }),
  });
  if (!r.ok) throw new Error(`POST /v1/x402/settle → ${r.status} ${await r.text()}`);
  const settled = await r.json();
  if (!settled.id) throw new Error("settle: missing receipt id");
  console.log("ok  POST /v1/x402/settle", settled.id);

  r = await fetch(`${BASE}/v1/receipts?limit=50`);
  if (!r.ok) throw new Error(`GET /v1/receipts → ${r.status}`);
  const list = await r.json();
  const found = Array.isArray(list.receipts) && list.receipts.some((x) => x.id === settled.id);
  if (!found) throw new Error("receipts list does not include settled id");
  console.log("ok  GET /v1/receipts");

  if (process.env.E2E_AGENT_WALLET === "1") {
    r = await fetch(`${BASE}/v1/wallets`, {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    });
    if (!r.ok) throw new Error(`POST /v1/wallets → ${r.status} ${await r.text()}`);
    const w = await r.json();
    if (!w.publicKey) throw new Error("wallet create: missing publicKey");
    console.log("ok  POST /v1/wallets", w.publicKey);
  }

  console.log("E2E happy path passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
