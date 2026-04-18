import { config } from "../config";

export interface SupportedResponse {
  version: string;
  stellar: {
    network: string;
    horizonUrl: string;
    assets: { code: string; issuer?: string }[];
  };
  facilitator: { name: string; policies: string[] };
}

let cached: { at: number; body: SupportedResponse } | null = null;
const TTL_MS = 60_000;

export function getSupportedCached(): SupportedResponse {
  const now = Date.now();
  if (cached && now - cached.at < TTL_MS) {
    return cached.body;
  }
  const body: SupportedResponse = {
    version: "paykit-x402/0.1",
    stellar: {
      network: config.stellar.network,
      horizonUrl: config.stellar.horizonUrl,
      assets: [
        { code: "XLM" },
        { code: "USDC", issuer: config.stellar.usdcIssuer },
        ...(config.stellar.pyusdIssuer ? [{ code: "PYUSD", issuer: config.stellar.pyusdIssuer }] : []),
      ],
    },
    facilitator: {
      name: "paykit-api",
      policies: ["spending-policy-v1"],
    },
  };
  cached = { at: now, body };
  return body;
}
