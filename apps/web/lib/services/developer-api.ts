import axios from "axios";
import { useDeveloperAuthStore } from "@/lib/store/developer-auth-store";

const baseURL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export const developerApi = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

developerApi.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? useDeveloperAuthStore.getState().token : null;
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

export async function getAuthMe(explicitToken?: string) {
  const token =
    explicitToken ?? (typeof window !== "undefined" ? useDeveloperAuthStore.getState().token : null);
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const { data } = await developerApi.get<{
    id: string;
    email?: string;
    name?: string;
    provider?: string;
    plan: string;
    createdAt: string;
  }>("/auth/me", { headers });
  return data;
}

export async function listOrganizations() {
  const { data } = await developerApi.get<{
    organizations: Array<{ id: string; name: string; ownerId: string; plan: string; createdAt: string }>;
  }>("/organizations");
  return data.organizations;
}

export async function createOrganization(name: string) {
  const { data } = await developerApi.post<{
    id: string;
    name: string;
    ownerId: string;
    plan: string;
    createdAt: string;
  }>("/organizations", { name });
  return data;
}

export async function createApiKey(organizationId?: string, name?: string) {
  const { data } = await developerApi.post<{ id: string; key: string; keyPrefix: string; message: string }>(
    "/apikey/create",
    { organizationId, name }
  );
  return data;
}

export async function listApiKeys(organizationId?: string) {
  const params = organizationId ? { organizationId } : {};
  const { data } = await developerApi.get<{
    apiKeys: Array<{ id: string; keyPrefix: string; name?: string; createdAt: string; lastUsedAt?: string }>;
  }>("/apikey/list", { params });
  return data.apiKeys;
}

export async function deleteApiKey(id: string, organizationId?: string) {
  const params = organizationId ? { organizationId } : {};
  await developerApi.delete(`/apikey/${id}`, { params });
}
