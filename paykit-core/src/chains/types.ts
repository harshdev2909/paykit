/**
 * Chain-agnostic interface for wallet and payment operations.
 * Implementations: StellarAdapter, (future) SolanaAdapter, EthereumAdapter.
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

export interface PaymentResult {
  txHash: string;
  chain: string;
  status: "success" | "failed";
}

export interface PaymentDetectionCallback {
  (params: { txHash: string; from: string; to: string; asset: string; amount: string }): void | Promise<void>;
}

export interface BlockchainAdapter {
  readonly chainId: string;

  createWallet(): Promise<WalletResult>;

  getBalance(address: string, asset: string): Promise<BalanceResult | null>;

  sendPayment(params: {
    fromWalletId: string;
    toAddress: string;
    asset: string;
    amount: string;
  }): Promise<PaymentResult>;

  /**
   * Register interest in payments to the given address.
   * The global watcher will invoke the callback when a payment is detected.
   */
  watchTransactions?(addresses: string[], onPayment: PaymentDetectionCallback): void;
}
