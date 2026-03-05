/**
 * Stellar Anchor Platform integration (SEP-24).
 * Fetches anchor info from stellar.toml, requests deposit/withdraw sessions,
 * returns redirect URL for the anchor's interactive UI.
 * Uses SEP-10 (Web Auth) JWT when keypair is provided to satisfy anchor auth.
 */

import { Keypair } from "@stellar/stellar-sdk";
import { Transaction } from "@stellar/stellar-sdk";
import { config } from "../config";

const STELLAR_TOML_PATH = ".well-known/stellar.toml";

export interface AnchorConfig {
  transferServerSep24: string;
  domain: string;
  webAuthEndpoint?: string;
}

export interface DepositRequest {
  anchorDomain: string;
  assetCode: string;
  account: string;
  email?: string;
  memo?: string;
}

export interface WithdrawRequest {
  anchorDomain: string;
  assetCode: string;
  account: string;
  type?: string;
  email?: string;
  memo?: string;
}

export interface AnchorInteractiveResponse {
  url: string;
  id?: string;
}

async function fetchStellarToml(domain: string): Promise<Record<string, string>> {
  const base = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const url = `https://${base}/${STELLAR_TOML_PATH}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) {
    throw new Error(`Failed to fetch stellar.toml from ${domain}: ${res.status}`);
  }
  const text = await res.text();
  const out: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (t.startsWith("TRANSFER_SERVER_SEP0024")) {
      const eq = t.indexOf("=");
      if (eq !== -1) out.transferServerSep24 = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    }
    if (t.startsWith("WEB_AUTH_ENDPOINT")) {
      const eq = t.indexOf("=");
      if (eq !== -1) out.webAuthEndpoint = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    }
  }
  return out;
}

export async function getAnchorConfig(anchorDomain: string): Promise<AnchorConfig> {
  const parsed = await fetchStellarToml(anchorDomain);
  const transferServerSep24 = parsed.transferServerSep24;
  if (!transferServerSep24) {
    throw new Error(`Anchor ${anchorDomain} has no TRANSFER_SERVER_SEP0024 in stellar.toml`);
  }
  const domain = anchorDomain.replace(/^https?:\/\//, "").split("/")[0];
  return {
    transferServerSep24,
    domain,
    webAuthEndpoint: parsed.webAuthEndpoint,
  };
}

/** SEP-10: get JWT from anchor by signing the challenge. Required for SEP-24 when anchor returns 403. */
async function getSep10Jwt(
  webAuthEndpoint: string,
  account: string,
  keypair: Keypair
): Promise<string> {
  const base = webAuthEndpoint.replace(/\/$/, "");
  const getUrl = `${base}?account=${encodeURIComponent(account)}`;
  const getRes = await fetch(getUrl, { signal: AbortSignal.timeout(15000) });
  if (!getRes.ok) {
    const errText = await getRes.text();
    throw new Error(`SEP-10 challenge failed: ${getRes.status} ${errText}`);
  }
  const challenge = (await getRes.json()) as { transaction?: string; network_passphrase?: string };
  const txXdr = challenge.transaction;
  const networkPassphrase = challenge.network_passphrase ?? (config.stellar.network === "testnet" ? "Test SDF Network ; September 2015" : "Public Global Stellar Network ; September 2015");
  if (!txXdr || typeof txXdr !== "string") {
    throw new Error("SEP-10 challenge missing transaction");
  }
  const tx = new Transaction(txXdr, networkPassphrase);
  tx.sign(keypair);
  const signedXdr = tx.toEnvelope().toXDR("base64");
  const postRes = await fetch(base, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ transaction: signedXdr }).toString(),
    signal: AbortSignal.timeout(15000),
  });
  if (!postRes.ok) {
    const errText = await postRes.text();
    throw new Error(`SEP-10 auth failed: ${postRes.status} ${errText}`);
  }
  const tokenPayload = (await postRes.json()) as { token?: string; jwt?: string };
  const token = tokenPayload.token ?? tokenPayload.jwt;
  if (!token || typeof token !== "string") {
    throw new Error("SEP-10 response missing token");
  }
  return token;
}

export async function requestDepositUrl(
  req: DepositRequest,
  keypair?: Keypair
): Promise<AnchorInteractiveResponse> {
  const anchorConfig = await getAnchorConfig(req.anchorDomain);
  const { transferServerSep24, webAuthEndpoint } = anchorConfig;
  const base = transferServerSep24.replace(/\/$/, "");
  const url = `${base}/transactions/deposit/interactive`;
  const body: Record<string, string> = {
    asset_code: req.assetCode,
    account: req.account,
  };
  if (req.email) body.email = req.email;
  if (req.memo) body.memo = req.memo;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (keypair && webAuthEndpoint) {
    try {
      const jwt = await getSep10Jwt(webAuthEndpoint, req.account, keypair);
      headers["Authorization"] = `Bearer ${jwt}`;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "SEP-10 auth failed";
      throw new Error(`Anchor deposit (SEP-10): ${msg}`);
    }
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anchor deposit request failed: ${res.status} ${errText}`);
  }
  const data = (await res.json()) as { url: string; id?: string };
  return { url: data.url, id: data.id };
}

export async function requestWithdrawUrl(
  req: WithdrawRequest,
  keypair?: Keypair
): Promise<AnchorInteractiveResponse> {
  const anchorConfig = await getAnchorConfig(req.anchorDomain);
  const { transferServerSep24, webAuthEndpoint } = anchorConfig;
  const base = transferServerSep24.replace(/\/$/, "");
  const url = `${base}/transactions/withdraw/interactive`;
  const body: Record<string, string> = {
    asset_code: req.assetCode,
    account: req.account,
  };
  if (req.type) body.type = req.type;
  if (req.email) body.email = req.email;
  if (req.memo) body.memo = req.memo;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (keypair && webAuthEndpoint) {
    try {
      const jwt = await getSep10Jwt(webAuthEndpoint, req.account, keypair);
      headers["Authorization"] = `Bearer ${jwt}`;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "SEP-10 auth failed";
      throw new Error(`Anchor withdraw (SEP-10): ${msg}`);
    }
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anchor withdraw request failed: ${res.status} ${errText}`);
  }
  const data = (await res.json()) as { url: string; id?: string };
  return { url: data.url, id: data.id };
}
