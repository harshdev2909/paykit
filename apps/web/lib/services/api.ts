import axios from "axios";
import type { CheckoutSessionStatus, WalletBalance } from "@/lib/types";
import { getPaykitApiBaseUrlOrFallback } from "@/lib/paykit-client";
import { useAuthStore } from "@/lib/store/auth-store";

const baseURL = process.env.NEXT_PUBLIC_API_URL?.trim() || getPaykitApiBaseUrlOrFallback();

export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const apiKey = useAuthStore.getState().apiKey;
  if (apiKey) {
    config.headers.set("x-api-key", apiKey);
  }
  return config;
});

export async function createMerchant(name: string, webhookUrl?: string) {
  const { data } = await api.post<{ id: string; name: string; apiKey: string; webhookUrl?: string; createdAt: string }>(
    "/merchant/create",
    { name, webhookUrl }
  );
  return data;
}

export async function getCheckoutStatus(sessionId: string) {
  const { data } = await api.get<CheckoutSessionStatus>(`/checkout/status/${sessionId}`);
  return data;
}

export async function getWalletBalance(walletId: string) {
  const { data } = await api.get<{ balances: WalletBalance[] }>(`/wallet/${walletId}/balance`);
  return data.balances;
}

export async function getWallet(walletId: string) {
  const { data } = await api.get<{ id: string; publicKey: string; balances: WalletBalance[]; createdAt: string }>(
    `/wallet/${walletId}`
  );
  return data;
}

export async function createCheckoutSession(body: {
  amount: string;
  asset: string;
  success_url?: string;
  cancel_url?: string;
  description?: string;
  auto_yield?: boolean;
}) {
  const { data } = await api.post<{
    id: string;
    walletAddress: string;
    amount: string;
    asset: string;
    status: string;
    expiresAt: string;
  }>("/merchant/checkout/create", {
    ...body,
    success_url: body.success_url,
    cancel_url: body.cancel_url,
    auto_yield: body.auto_yield,
  });
  return data;
}

export async function createEmbeddedWallet(params: { email?: string; provider?: string; providerId?: string }) {
  const { data } = await api.post<{ walletId: string; publicKey: string; createdAt: string }>(
    "/wallet/embedded/create",
    params
  );
  return data;
}

export async function getEmbeddedBalance(walletId: string) {
  const { data } = await api.get<{ balances: Array<{ asset: string; balance: string }> }>(
    "/wallet/embedded/balance",
    { params: { walletId } }
  );
  return data.balances;
}

export async function registerBlockchainWebhook(params: {
  url: string;
  events?: string[];
  event?: string;
  secret?: string;
}) {
  const { data } = await api.post<{ id: string; url: string; events: string[]; active: boolean }>(
    "/blockchain/webhook",
    params
  );
  return data;
}
