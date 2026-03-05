import rateLimit from "express-rate-limit";
import { config } from "../../config";

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: config.nodeEnv === "production" ? 100 : 1000,
  message: { error: "Too many requests" },
  standardHeaders: true,
  legacyHeaders: false,
});

export const paymentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: "Too many payment requests" },
  standardHeaders: true,
  legacyHeaders: false,
});
