/**
 * Chain-agnostic interface for wallet operations (payments are internal / x402-only in the new stack).
 */
export interface WalletResult {
  walletId: string;
  address: string;
  chain: string;
}

export interface BalanceResult {
  asset: string;
  amount: string;
  chain: string;
}

export interface BlockchainAdapter {
  readonly chainId: string;

  createWallet(): Promise<WalletResult>;

  getBalance(address: string, asset: string): Promise<BalanceResult | null>;
}
