import Redis from "ioredis";
import { config } from "../config";

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(config.redis.url, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => (times <= 5 ? 2000 : null),
    });
    redis.on("error", (err) => {
      console.warn("[Redis]", err.message);
    });
    redis.on("close", () => {
      console.warn("[Redis] connection closed");
    });
  }
  return redis;
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}

const IDEMPOTENCY_PREFIX = "idempotency:";
const IDEMPOTENCY_LOCK_PREFIX = "idempotency_lock:";
const LOCK_TTL_SECONDS = 120;

export async function getIdempotencyResult<T>(key: string): Promise<T | null> {
  const client = getRedis();
  const raw = await client.get(`${IDEMPOTENCY_PREFIX}${key}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setIdempotencyResult<T>(
  key: string,
  value: T,
  ttlSeconds: number
): Promise<void> {
  const client = getRedis();
  await client.setex(
    `${IDEMPOTENCY_PREFIX}${key}`,
    ttlSeconds,
    JSON.stringify(value)
  );
}

export async function acquireIdempotencyLock(key: string): Promise<boolean> {
  const client = getRedis();
  const lockKey = `${IDEMPOTENCY_LOCK_PREFIX}${key}`;
  const result = await client.set(lockKey, "1", "EX", LOCK_TTL_SECONDS, "NX");
  return result === "OK";
}

export async function releaseIdempotencyLock(key: string): Promise<void> {
  const client = getRedis();
  await client.del(`${IDEMPOTENCY_LOCK_PREFIX}${key}`);
}

const TX_QUEUE_KEY = "paykit:tx_queue";
const TX_STATUS_PREFIX = "paykit:tx_status:";

export interface QueuedTxPayload {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  idempotencyKey: string;
  attempts: number;
  createdAt: string;
}

export async function enqueueTransaction(
  type: string,
  payload: Record<string, unknown>,
  idempotencyKey: string
): Promise<string> {
  const client = getRedis();
  const id = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const item: QueuedTxPayload = {
    id,
    type,
    payload,
    idempotencyKey,
    attempts: 0,
    createdAt: new Date().toISOString(),
  };
  await client.rpush(TX_QUEUE_KEY, JSON.stringify(item));
  return id;
}

export async function getTxStatus(txId: string): Promise<{ status: string; result?: unknown } | null> {
  const client = getRedis();
  const raw = await client.get(`${TX_STATUS_PREFIX}${txId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { status: string; result?: unknown };
  } catch {
    return null;
  }
}

export async function setTxStatus(
  txId: string,
  status: string,
  result?: unknown,
  ttlSeconds = 86400
): Promise<void> {
  const client = getRedis();
  await client.setex(
    `${TX_STATUS_PREFIX}${txId}`,
    ttlSeconds,
    JSON.stringify({ status, result })
  );
}
