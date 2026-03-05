import { Request, Response, NextFunction } from "express";
import { getRedis } from "../../services/redis";
import { Plan } from "../../database/models";
import type { MerchantRequest } from "./verifyOrgOrMerchantKey";

const WINDOW_SEC = 1;

export async function planRateLimit(req: MerchantRequest, res: Response, next: NextFunction): Promise<void> {
  const orgId = req.organizationId;
  if (!orgId) {
    return next();
  }
  try {
    const org = await import("../../database/models").then((m) => m.Organization.findById(orgId).lean().exec());
    const planSlug = org ? (org as { plan: string }).plan : "free";
    const plan = await Plan.findOne({ slug: planSlug }).lean().exec();
    const limit = plan ? (plan as { rateLimitPerSec: number }).rateLimitPerSec : 10;
    const key = `paykit:plan_ratelimit:${orgId}:${Math.floor(Date.now() / 1000)}`;
    const client = getRedis();
    const count = await client.incr(key);
    if (count === 1) {
      await client.expire(key, WINDOW_SEC + 1);
    }
    res.setHeader("X-RateLimit-Limit", String(limit));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, limit - count)));
    if (count > limit) {
      res.status(429).json({ error: "Rate limit exceeded. Try again later." });
      return;
    }
    next();
  } catch (err) {
    next(err);
  }
}
