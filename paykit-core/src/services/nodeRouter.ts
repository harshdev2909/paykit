/**
 * RPC / Node router — abstracts blockchain node endpoints.
 * Allows switching between public and private nodes.
 */

import { config } from "../config";

export type NodeTier = "public" | "private";

let currentTier: NodeTier = "public";

export function getHorizonUrl(): string {
  if (currentTier === "private" && process.env.HORIZON_PRIVATE_URL) {
    return process.env.HORIZON_PRIVATE_URL;
  }
  return config.stellar.horizonUrl;
}

export function setNodeTier(tier: NodeTier): void {
  currentTier = tier;
}

export function getNodeTier(): NodeTier {
  return currentTier;
}
