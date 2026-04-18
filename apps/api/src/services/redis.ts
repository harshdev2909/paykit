/**
 * Redis client — optional. When REDIS_URL is unset or empty, all helpers no-op or return safe defaults.
 * Rate limiting, idempotency, event stream, and webhook queue are disabled without Redis.
 */
import Redis from "ioredis";
import { config } from "../config";

let redis: Redis | null = null;
let redisDisabled = false;

export function getRedisOptional(): Redis | null {
  if (redisDisabled) return null;
  if (!config.redis.url || config.redis.url.trim() === "") {
    redisDisabled = true;
    return null;
  }
  if (!redis) {
    try {
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
    } catch (err) {
      console.warn("[Redis] init failed", err instanceof Error ? err.message : err);
      redisDisabled = true;
      return null;
    }
  }
  return redis;
}

/** Use when Redis is required (legacy). Prefer safe helpers below when Redis may be unavailable. */
export function getRedis(): Redis {
  const client = getRedisOptional();
  if (!client) throw new Error("Redis is not configured. Set REDIS_URL for rate limiting, idempotency, and events.");
  return client;
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
  const client = getRedisOptional();
  if (!client) return null;
  try {
    const raw = await client.get(`${IDEMPOTENCY_PREFIX}${key}`);
    if (!raw) return null;
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
  const client = getRedisOptional();
  if (!client) return;
  try {
    await client.setex(
      `${IDEMPOTENCY_PREFIX}${key}`,
      ttlSeconds,
      JSON.stringify(value)
    );
  } catch {
    /* ignore */
  }
}

export async function acquireIdempotencyLock(key: string): Promise<boolean> {
  const client = getRedisOptional();
  if (!client) return true;
  try {
    const lockKey = `${IDEMPOTENCY_LOCK_PREFIX}${key}`;
    const result = await client.set(lockKey, "1", "EX", LOCK_TTL_SECONDS, "NX");
    return result === "OK";
  } catch {
    return true;
  }
}

export async function releaseIdempotencyLock(key: string): Promise<void> {
  const client = getRedisOptional();
  if (!client) return;
  try {
    await client.del(`${IDEMPOTENCY_LOCK_PREFIX}${key}`);
  } catch {
    /* ignore */
  }
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
  const client = getRedisOptional();
  const id = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  if (!client) return id;
  try {
    const item: QueuedTxPayload = {
      id,
      type,
      payload,
      idempotencyKey,
      attempts: 0,
      createdAt: new Date().toISOString(),
    };
    await client.rpush(TX_QUEUE_KEY, JSON.stringify(item));
  } catch {
    /* ignore */
  }
  return id;
}

export async function getTxStatus(txId: string): Promise<{ status: string; result?: unknown } | null> {
  const client = getRedisOptional();
  if (!client) return null;
  try {
    const raw = await client.get(`${TX_STATUS_PREFIX}${txId}`);
    if (!raw) return null;
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
  const client = getRedisOptional();
  if (!client) return;
  try {
    await client.setex(
      `${TX_STATUS_PREFIX}${txId}`,
      ttlSeconds,
      JSON.stringify({ status, result })
    );
  } catch {
    /* ignore */
  }
}
