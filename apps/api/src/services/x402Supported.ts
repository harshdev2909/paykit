import { config } from "../config";

export interface SupportedResponse {
  version: string;
  stellar: {
    network: string;
    horizonUrl: string;
    assets: { code: string; issuer?: string }[];
  };
  facilitator: { name: string; policies: string[] };
  /** Present when `SPENDING_POLICY_CONTRACT_ID` is set — on-chain policy plugin for Soroban smart accounts. */
  soroban?: {
    network: string;
    rpcUrl: string;
    spendingPolicyContractId: string;
    /** Policy interface version implemented by the deployed WASM */
    policyKind: "paykit-spending-policy-v1";
  };
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

  const cid = config.soroban.spendingPolicyContractId;
  if (cid) {
    body.soroban = {
      network: config.stellar.network,
      rpcUrl: config.soroban.rpcUrl,
      spendingPolicyContractId: cid,
      policyKind: "paykit-spending-policy-v1",
    };
  }
  cached = { at: now, body };
  return body;
}
