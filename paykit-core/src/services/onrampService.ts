/**
 * Onramp / Offramp service — integrates fiat ramps (MoonPay, Ramp Network).
 * Production would use provider SDKs and webhooks for completion.
 */

export interface OnrampBuyParams {
  walletId: string;
  publicKey: string;
  asset: string;
  fiatAmount: number;
  fiatCurrency: string;
  redirectUrl?: string;
}

export interface OnrampBuyResult {
  provider: "moonpay" | "ramp";
  widgetUrl: string;
  sessionId: string;
  status: "pending";
}

export interface OfframpWithdrawParams {
  walletId: string;
  asset: string;
  amount: string;
  destinationType: "bank" | "card";
  destinationId?: string;
}

export interface OfframpWithdrawResult {
  provider: "moonpay" | "ramp";
  withdrawalId: string;
  status: "pending";
  estimatedFiatAmount?: string;
  estimatedFiatCurrency?: string;
}

const MOONPAY_BASE = "https://buy-staging.moonpay.com";
const RAMP_BASE = "https://ri-widget-staging.firebaseapp.com";

function getMoonPayApiKey(): string {
  return process.env.MOONPAY_API_KEY ?? "pk_test_dummy";
}

function getRampApiKey(): string {
  return process.env.RAMP_API_KEY ?? "";
}

export async function createOnrampBuy(params: OnrampBuyParams): Promise<OnrampBuyResult> {
  const sessionId = `onramp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const apiKey = getMoonPayApiKey();
  const currencyCode = params.asset === "XLM" ? "xlm" : params.asset === "USDC" ? "usdc_stellar" : "usdc_stellar";
  const baseUrl = `${MOONPAY_BASE}?apiKey=${apiKey}&currencyCode=${currencyCode}&walletAddress=${encodeURIComponent(params.publicKey)}&externalTransactionId=${sessionId}`;
  if (params.redirectUrl) {
    // MoonPay supports redirectUrl for post-purchase redirect
  }
  return {
    provider: "moonpay",
    widgetUrl: baseUrl,
    sessionId,
    status: "pending",
  };
}

export async function createOfframpWithdraw(params: OfframpWithdrawParams): Promise<OfframpWithdrawResult> {
  const withdrawalId = `offramp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const rampKey = getRampApiKey();
  if (!rampKey) {
    return {
      provider: "ramp",
      withdrawalId,
      status: "pending",
      estimatedFiatAmount: undefined,
      estimatedFiatCurrency: params.asset === "USDC" ? "USD" : undefined,
    };
  }
  return {
    provider: "ramp",
    withdrawalId,
    status: "pending",
    estimatedFiatAmount: params.amount,
    estimatedFiatCurrency: "USD",
  };
}
