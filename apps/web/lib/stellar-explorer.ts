export type StellarNetworkPreset = "public" | "testnet" | "futurenet";

const EXPLORER_BASE: Record<StellarNetworkPreset, string> = {
  public: "https://stellar.expert/explorer/public",
  testnet: "https://stellar.expert/explorer/testnet",
  futurenet: "https://stellar.expert/explorer/futurenet",
};

/** Account or contract page on stellar.expert */
export function stellarExpertAccountUrl(
  address: string,
  network: StellarNetworkPreset = "testnet",
): string {
  const base = EXPLORER_BASE[network] ?? EXPLORER_BASE.testnet;
  return `${base}/account/${encodeURIComponent(address)}`;
}

export function stellarExpertTxUrl(
  txHash: string,
  network: StellarNetworkPreset = "testnet",
): string {
  const base = EXPLORER_BASE[network] ?? EXPLORER_BASE.testnet;
  return `${base}/tx/${encodeURIComponent(txHash)}`;
}
