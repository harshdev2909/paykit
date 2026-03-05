import crypto from "crypto";
import { ApiKey, Organization } from "../database/models";

const KEY_PREFIX = "pk_";
const HASH_ALGORITHM = "sha256";

function hashKey(key: string): string {
  return crypto.createHash(HASH_ALGORITHM).update(key).digest("hex");
}

function generateSecureKey(): string {
  return KEY_PREFIX + crypto.randomBytes(24).toString("hex");
}

export function hashApiKey(key: string): string {
  return hashKey(key);
}

export function getKeyPrefix(key: string): string {
  if (key.startsWith(KEY_PREFIX) && key.length > KEY_PREFIX.length) {
    return key.slice(0, KEY_PREFIX.length + 8);
  }
  return key.slice(0, 12);
}

export async function createApiKey(
  organizationId: string,
  name?: string
): Promise<{ id: string; key: string; keyPrefix: string }> {
  const rawKey = generateSecureKey();
  const keyHash = hashKey(rawKey);
  const keyPrefix = getKeyPrefix(rawKey);
  const doc = await ApiKey.create({
    organizationId,
    keyHash,
    keyPrefix,
    name: name ?? "API Key",
  });
  return {
    id: doc._id.toString(),
    key: rawKey,
    keyPrefix: doc.keyPrefix,
  };
}

export async function findOrganizationByApiKey(rawKey: string): Promise<{ organizationId: string; defaultMerchantId?: string } | null> {
  const keyHash = hashKey(rawKey);
  const apiKey = await ApiKey.findOne({ keyHash }).lean().exec();
  if (!apiKey) return null;
  const key = apiKey as { _id: unknown; organizationId: unknown };
  await ApiKey.updateOne({ _id: key._id }, { $set: { lastUsedAt: new Date() } }).exec();
  const org = await Organization.findById(key.organizationId).lean().exec();
  if (!org) return null;
  const o = org as { _id: { toString(): string }; defaultMerchantId?: { toString(): string } };
  return {
    organizationId: o._id.toString(),
    defaultMerchantId: o.defaultMerchantId?.toString(),
  };
}

export async function listApiKeys(organizationId: string): Promise<{ id: string; keyPrefix: string; name?: string; createdAt: Date; lastUsedAt?: Date }[]> {
  const keys = await ApiKey.find({ organizationId })
    .select("keyPrefix name createdAt lastUsedAt")
    .sort({ createdAt: -1 })
    .lean()
    .exec();
  const kList = keys as Array<{ _id: { toString(): string }; keyPrefix: string; name?: string; createdAt: Date; lastUsedAt?: Date }>;
  return kList.map((k) => ({
    id: k._id.toString(),
    keyPrefix: k.keyPrefix,
    name: k.name,
    createdAt: k.createdAt,
    lastUsedAt: k.lastUsedAt,
  }));
}

export async function deleteApiKey(apiKeyId: string, organizationId: string): Promise<boolean> {
  const result = await ApiKey.deleteOne({ _id: apiKeyId, organizationId }).exec();
  return (result.deletedCount ?? 0) > 0;
}
