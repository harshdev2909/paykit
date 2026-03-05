/**
 * Observability — metrics and structured logging for production.
 */

import { getRedis } from "./redis";

const METRIC_PREFIX = "paykit:metric:";
const LOG_PREFIX = "paykit:log";

export const metrics = {
  async incrementCounter(name: string, value = 1): Promise<void> {
    try {
      const redis = getRedis();
      await redis.incrby(`${METRIC_PREFIX}${name}`, value);
    } catch {
      // no-op
    }
  },

  async recordLatency(name: string, ms: number): Promise<void> {
    try {
      const redis = getRedis();
      await redis.lpush(`${METRIC_PREFIX}latency:${name}`, String(ms));
      await redis.ltrim(`${METRIC_PREFIX}latency:${name}`, 0, 999);
    } catch {
      // no-op
    }
  },

  async getCounter(name: string): Promise<number> {
    try {
      const redis = getRedis();
      const v = await redis.get(`${METRIC_PREFIX}${name}`);
      return parseInt(v ?? "0", 10);
    } catch {
      return 0;
    }
  },
};

export function log(level: "info" | "warn" | "error", message: string, meta?: Record<string, unknown>): void {
  const payload = JSON.stringify({
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  });
  if (level === "error") {
    console.error(payload);
  } else if (level === "warn") {
    console.warn(payload);
  } else {
    console.log(payload);
  }
}

export async function getMetricsSnapshot(): Promise<{
  transactionSuccesses: number;
  transactionFailures: number;
  apiLatencySamples: Record<string, number[]>;
}> {
  const redis = getRedis();
  const [successes, failures] = await Promise.all([
    redis.get(`${METRIC_PREFIX}tx_success`),
    redis.get(`${METRIC_PREFIX}tx_failure`),
  ]);
  return {
    transactionSuccesses: parseInt(successes ?? "0", 10),
    transactionFailures: parseInt(failures ?? "0", 10),
    apiLatencySamples: {},
  };
}
