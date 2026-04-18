import axios, { AxiosError } from "axios";

import { getPaykitApiBaseUrl } from "@/lib/paykit-client";
import { useAuthStore } from "@/lib/store/auth-store";

export type PayKitAgentWallet = {
  id: string;
  publicKey: string;
  kind: string;
  agentPolicy?: Record<string, unknown>;
  createdAt: string;
  balances?: Array<{ asset: string; balance: string }>;
};

export type PayKitReceipt = {
  id: string;
  merchantId: string;
  walletFrom: string;
  walletTo: string;
  asset: string;
  amount: string;
  status: string;
  domain?: string | null;
  path?: string | null;
  facilitatorTxHash?: string | null;
  stellarTxHash?: string | null;
  signedReceipt?: string | null;
  settledAt?: string | null;
  createdAt: string;
};

export function paykitApiBaseConfigured(): boolean {
  return !!getPaykitApiBaseUrl();
}

export const paykitApi = axios.create({
  baseURL: getPaykitApiBaseUrl() || undefined,
  headers: { "Content-Type": "application/json" },
});

paykitApi.interceptors.request.use((config) => {
  const apiKey = useAuthStore.getState().apiKey;
  if (apiKey) {
    config.headers.set("x-api-key", apiKey);
  }
  return config;
});

export async function fetchAgentWallets(): Promise<PayKitAgentWallet[]> {
  const { data } = await paykitApi.get<{ wallets: PayKitAgentWallet[] }>("/v1/wallets");
  return data.wallets ?? [];
}

export async function fetchReceipts(limit = 20, offset = 0): Promise<PayKitReceipt[]> {
  const { data } = await paykitApi.get<{ receipts: PayKitReceipt[] }>("/v1/receipts", {
    params: { limit, offset },
  });
  return data.receipts ?? [];
}

export async function createAgentWallet(body?: { agentPolicy?: Record<string, unknown> }): Promise<PayKitAgentWallet> {
  const { data } = await paykitApi.post<PayKitAgentWallet>("/v1/wallets", body ?? {});
  return data;
}

export async function fundWallet(walletId: string): Promise<void> {
  await paykitApi.post(`/v1/wallets/${walletId}/fund`);
}

export function formatPaykitAxiosError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const ax = err as AxiosError<{ error?: unknown }>;
    const msg = ax.response?.data?.error;
    if (typeof msg === "string") return msg;
    if (typeof ax.response?.status === "number") return `HTTP ${ax.response.status}`;
  }
  return err instanceof Error ? err.message : "Request failed";
}
