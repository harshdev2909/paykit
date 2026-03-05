import axios, { type AxiosInstance } from "axios";

export interface PayKitOptions {
  apiKey: string;
  baseUrl?: string;
}

export interface CreateWalletResult {
  id: string;
  publicKey: string;
  createdAt: string;
}

export interface CreateEmbeddedWalletParams {
  email?: string;
  provider?: string;
  providerId?: string;
}

export interface CreateEmbeddedWalletResult {
  walletId: string;
  publicKey: string;
  createdAt: string;
}

export interface WalletBalance {
  asset: string;
  balance: string;
}

export interface SendPaymentParams {
  fromWalletId: string;
  toAddress: string;
  asset: string;
  amount: string;
}

export interface CreateCheckoutParams {
  amount: string;
  asset: string;
  merchantId?: string;
  success_url?: string;
  cancel_url?: string;
  description?: string;
}

export interface CreateCheckoutResult {
  id: string;
  walletAddress: string;
  amount: string;
  asset: string;
  status: string;
  expiresAt: string;
}

export interface SwapParams {
  walletId: string;
  fromAsset: string;
  toAsset: string;
  amount: string;
}

export interface SwapResult {
  txHash: string;
  fromAsset: string;
  toAsset: string;
  amount: string;
  status: string;
}

export interface SwapQuoteResult {
  fromAsset: string;
  toAsset: string;
  sendAmount: string;
  estimatedAmountOut: string;
  pathAvailable: boolean;
}

export function createClient(options: PayKitOptions): PayKitClient {
  return new PayKitClient(options);
}

export class PayKitClient {
  private api: AxiosInstance;

  constructor(options: PayKitOptions) {
    const baseURL = options.baseUrl ?? "http://localhost:3000";
    this.api = axios.create({
      baseURL,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": options.apiKey,
        Authorization: `Bearer ${options.apiKey}`,
      },
    });
  }

  /** Create a wallet (optional userId for linking). */
  async createWallet(userId?: string): Promise<CreateWalletResult> {
    const { data } = await this.api.post<CreateWalletResult>("/wallet/create", { userId });
    return data;
  }

  /** Create or get embedded wallet by email or social (Privy-style). Keys are encrypted server-side. */
  async createEmbeddedWallet(params: CreateEmbeddedWalletParams): Promise<CreateEmbeddedWalletResult> {
    const { data } = await this.api.post<CreateEmbeddedWalletResult>("/wallet/embedded/create", params);
    return data;
  }

  /** Sign a transaction envelope for an embedded wallet. Returns signed XDR base64. */
  async signEmbeddedTransaction(walletId: string, envelopeXdr: string): Promise<{ signedEnvelopeXdr: string }> {
    const { data } = await this.api.post<{ signedEnvelopeXdr: string }>("/wallet/embedded/sign", {
      walletId,
      envelopeXdr,
    });
    return data;
  }

  /** Get balance for an embedded wallet. */
  async getEmbeddedBalance(walletId: string): Promise<WalletBalance[]> {
    const { data } = await this.api.get<{ balances: WalletBalance[] }>("/wallet/embedded/balance", {
      params: { walletId },
    });
    return data.balances;
  }

  async getWallet(walletId: string): Promise<{ id: string; publicKey: string; balances: WalletBalance[]; createdAt: string }> {
    const { data } = await this.api.get(`/wallet/${walletId}`);
    return data;
  }

  async getBalance(walletId: string): Promise<WalletBalance[]> {
    const { data } = await this.api.get<{ balances: WalletBalance[] }>(`/wallet/${walletId}/balance`);
    return data.balances;
  }

  async sendPayment(params: SendPaymentParams): Promise<{ txHash: string }> {
    const { data } = await this.api.post<{ txHash: string }>("/payment", params);
    return data;
  }

  async createCheckout(params: CreateCheckoutParams): Promise<CreateCheckoutResult> {
    const { data } = await this.api.post<CreateCheckoutResult>("/merchant/checkout/create", {
      amount: params.amount,
      asset: params.asset,
      success_url: params.success_url,
      cancel_url: params.cancel_url,
      description: params.description,
    });
    return data;
  }

  /** Get swap quote (estimated amount out) without executing. */
  async getSwapQuote(params: SwapParams): Promise<SwapQuoteResult> {
    const { data } = await this.api.get<SwapQuoteResult>("/swap/quote", { params });
    return data;
  }

  /** On-chain swap (path payment). Best price routing. */
  async swap(params: SwapParams): Promise<SwapResult> {
    const { data } = await this.api.post<SwapResult>("/swap", params);
    return data;
  }

  /** Start onramp (fiat -> crypto). Returns widget URL. */
  async onrampBuy(params: { walletId: string; asset?: string; fiatAmount?: number; fiatCurrency?: string }): Promise<{
    provider: string;
    widgetUrl: string;
    sessionId: string;
    status: string;
  }> {
    const { data } = await this.api.post("/onramp/buy", params);
    return data;
  }

  /** Start offramp (crypto -> fiat). */
  async onrampWithdraw(params: { walletId: string; asset?: string; amount: string }): Promise<{
    provider: string;
    withdrawalId: string;
    status: string;
  }> {
    const { data } = await this.api.post("/onramp/withdraw", params);
    return data;
  }

  /** Get yield positions (APY, principal, earnings). */
  async getYieldPositions(asset?: string): Promise<{
    positions: Array<{ asset: string; principal: string; yieldEarned: string; total: string; apy: string }>;
  }> {
    const { data } = await this.api.get("/yield/positions", { params: asset ? { asset } : {} });
    return data;
  }
}

export default createClient;
