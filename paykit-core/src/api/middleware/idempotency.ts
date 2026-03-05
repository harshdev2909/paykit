import { Request, Response, NextFunction } from "express";
import {
  getIdempotencyResult,
  setIdempotencyResult,
  acquireIdempotencyLock,
  releaseIdempotencyLock,
} from "../../services/redis";
import { config } from "../../config";

const HEADER_IDEMPOTENCY_KEY = "idempotency-key";

export function idempotencyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const key = req.header(HEADER_IDEMPOTENCY_KEY);
  if (!key || typeof key !== "string" || key.length > 128) {
    res.status(400).json({
      error: "Missing or invalid idempotency-key header (required for this endpoint)",
    });
    return;
  }

  (async () => {
    try {
      const existing = await getIdempotencyResult<{ status: number; body: unknown }>(
        key
      );
      if (existing) {
        res.status(existing.status).json(existing.body);
        return;
      }

      const acquired = await acquireIdempotencyLock(key);
      if (!acquired) {
        res.status(409).json({
          error: "A request with this idempotency key is already in progress",
        });
        return;
      }

      const originalJson = res.json.bind(res);
      res.json = function (body: unknown): Response {
        setIdempotencyResult(
          key,
          { status: res.statusCode, body },
          config.idempotency.ttlSeconds
        ).catch(() => {});
        releaseIdempotencyLock(key).catch(() => {});
        return originalJson(body);
      };
      next();
    } catch (err) {
      next(err);
    }
  })();
}
