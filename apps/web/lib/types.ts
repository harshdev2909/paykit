export interface Merchant {
  id: string;
  name: string;
  webhookUrl?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  amount: string;
  asset: string;
  txHash?: string;
  completedAt: string;
  status: string;
}

export interface MerchantBalance {
  asset: string;
  balance: string;
}

export interface MerchantAnalytics {
  totalVolume: string;
  totalTransactions: number;
  assetBreakdown: { asset: string; volume: string; count: number }[];
}

export interface CheckoutSessionStatus {
  id: string;
  status: "open" | "completed" | "expired" | "failed";
  amount: string;
  asset: string;
  walletAddress: string;
  description?: string;
  completedAt?: string;
  txHash?: string;
  expiresAt: string;
}

export interface WalletBalance {
  asset: string;
  balance: string;
  limit?: string;
}

export interface TreasuryBalance {
  assetCode: string;
  amount: string;
  yieldEnabled?: boolean;
  principalAmount?: string;
  yieldEarned?: string;
  apy?: string;
}
