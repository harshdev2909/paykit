import { Request, Response, NextFunction } from "express";
import { getRedisOptional } from "../../services/redis";

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_MERCHANT = 120;

export async function merchantRateLimit(req: Request, res: Response, next: NextFunction): Promise<void> {
  const merchantId = (req as Request & { merchantId?: string }).merchantId;
  if (!merchantId) {
    return next();
  }
  const client = getRedisOptional();
  if (!client) {
    return next();
  }
  try {
    const key = `paykit:merchant_ratelimit:${merchantId}`;
    const count = await client.incr(key);
    if (count === 1) {
      await client.pexpire(key, WINDOW_MS);
    }
    const ttl = await client.pttl(key);
    res.setHeader("X-RateLimit-Limit", String(MAX_REQUESTS_PER_MERCHANT));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, MAX_REQUESTS_PER_MERCHANT - count)));
    if (ttl > 0) {
      res.setHeader("X-RateLimit-Reset", String(Math.ceil(Date.now() / 1000 + ttl / 1000)));
    }
    if (count > MAX_REQUESTS_PER_MERCHANT) {
      res.status(429).json({ error: "Too many requests. Rate limit exceeded." });
      return;
    }
  } catch {
    /* allow through when Redis is down */
  }
  next();
}
