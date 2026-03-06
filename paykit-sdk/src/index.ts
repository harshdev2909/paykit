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
  /** Allocate incoming payment to yield (e.g. 50% liquid, 50% yield). */
  autoYield?: boolean;
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

export interface TreasuryStrategy {
  id: string;
  name: string;
  description: string;
  expectedApy: string;
  allocation: Array<{ label: string; percent: number }>;
}

export interface LiquidityPositionResult {
  positionId: string;
  asset: string;
  amount: string;
  poolId: string;
  apr: string;
  createdAt?: string;
}

export interface CreditLimitResult {
  treasuryAccountId: string;
  limitAmount: string;
  borrowedAmount: string;
  availableAmount: string;
  currency: string;
}

export interface FxQuoteResult {
  from: string;
  to: string;
  fromAmount: string;
  toAmount: string;
  rate: string;
  route: string[];
}

export function createClient(options: PayKitOptions): PayKitClient {
  return new PayKitClient(options);
}

export class PayKitClient {
  private api: AxiosInstance;

  constructor(options: PayKitOptions) {
    const baseURL = options.baseUrl ?? "https://paykit.onrender.com";
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
      auto_yield: params.autoYield,
    });
    return data;
  }

  /** Get swap quote (estimated amount out) without executing. */
  async getSwapQuote(params: SwapParams): Promise<SwapQuoteResult> {
    const { data } = await this.api.get<SwapQuoteResult>("/swap/quote", { params });
    return data;
  }

  /** On-chain swap (path payment). Best price routing. */
  async executeSwap(params: SwapParams): Promise<SwapResult> {
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

  // ——— Treasury (Earn / Smart strategies) ———
  async getTreasuryBalance(treasuryAccountId: string): Promise<{ balances: Array<{ assetCode: string; amount: string }> }> {
    const { data } = await this.api.get("/treasury/balance", { params: { treasuryAccountId } });
    return data;
  }

  async getTreasuryStrategies(): Promise<{ strategies: TreasuryStrategy[] }> {
    const { data } = await this.api.get<{ strategies: TreasuryStrategy[] }>("/treasury/strategies");
    return data;
  }

  async enableTreasuryStrategy(params: { treasuryAccountId: string; strategy: "conservative" | "balanced" | "yield_max" }): Promise<{ treasuryAccountId: string; strategy: string }> {
    const { data } = await this.api.post("/treasury/strategies/enable", params);
    return data;
  }

  // ——— Liquidity ———
  async liquidityDeposit(params: { asset?: string; amount: string }): Promise<LiquidityPositionResult> {
    const { data } = await this.api.post<LiquidityPositionResult>("/liquidity/deposit", {
      asset: params.asset ?? "USDC",
      amount: params.amount,
    });
    return data;
  }

  async liquidityWithdraw(params: { positionId: string; amount?: string }): Promise<{ amount: string; positionId: string }> {
    const { data } = await this.api.post("/liquidity/withdraw", params);
    return data;
  }

  async liquidityPositions(): Promise<{ positions: LiquidityPositionResult[] }> {
    const { data } = await this.api.get<{ positions: LiquidityPositionResult[] }>("/liquidity/positions");
    return data;
  }

  async getLiquidityPoolStats(): Promise<{ totalLiquidity: string; apr: string; poolId: string }> {
    const { data } = await this.api.get("/liquidity/pool");
    return data;
  }

  // ——— Credit ———
  async getCreditLimit(treasuryAccountId: string): Promise<CreditLimitResult> {
    const { data } = await this.api.get<CreditLimitResult>("/credit/limit", { params: { treasuryAccountId } });
    return data;
  }

  async creditBorrow(params: { treasuryAccountId: string; amount: string }): Promise<{ amount: string; outstanding: string }> {
    const { data } = await this.api.post("/credit/borrow", params);
    return data;
  }

  async creditRepay(params: { treasuryAccountId: string; amount: string }): Promise<{ amount: string; outstanding: string }> {
    const { data } = await this.api.post("/credit/repay", params);
    return data;
  }

  // ——— FX ———
  async getFxQuote(params: { from: string; to: string; amount: string; walletId?: string }): Promise<FxQuoteResult> {
    const { data } = await this.api.get<FxQuoteResult>("/fx/quote", { params: { ...params, walletId: params.walletId } });
    return data;
  }

  /** Namespaced API for PayKit.treasury, PayKit.swap, etc. */
  get treasury() {
    return {
      getBalance: (treasuryAccountId: string) => this.getTreasuryBalance(treasuryAccountId),
      getStrategies: () => this.getTreasuryStrategies(),
      enableStrategy: (params: { treasuryAccountId: string; strategy: "conservative" | "balanced" | "yield_max" }) => this.enableTreasuryStrategy(params),
    };
  }

  get swap() {
    return {
      getQuote: (params: SwapParams) => this.getSwapQuote(params),
      execute: (params: SwapParams) => this.executeSwap(params),
    };
  }

  get liquidity() {
    return {
      deposit: (params: { asset?: string; amount: string }) => this.liquidityDeposit(params),
      withdraw: (params: { positionId: string; amount?: string }) => this.liquidityWithdraw(params),
      positions: () => this.liquidityPositions(),
      getPoolStats: () => this.getLiquidityPoolStats(),
    };
  }

  get credit() {
    return {
      getLimit: (treasuryAccountId: string) => this.getCreditLimit(treasuryAccountId),
      borrow: (params: { treasuryAccountId: string; amount: string }) => this.creditBorrow(params),
      repay: (params: { treasuryAccountId: string; amount: string }) => this.creditRepay(params),
    };
  }

  get yield() {
    return {
      getPositions: (asset?: string) => this.getYieldPositions(asset),
    };
  }

  get fx() {
    return {
      quote: (params: { from: string; to: string; amount: string; walletId?: string }) => this.getFxQuote(params),
    };
  }

  get payments() {
    return {
      create: (params: CreateCheckoutParams) => this.createCheckout(params),
    };
  }

  get wallet() {
    return {
      create: (userId?: string) => this.createWallet(userId),
      get: (walletId: string) => this.getWallet(walletId),
      getBalance: (walletId: string) => this.getBalance(walletId),
      sendPayment: (params: SendPaymentParams) => this.sendPayment(params),
    };
  }
}

export default createClient;
