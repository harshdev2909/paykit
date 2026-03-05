import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import passport from "passport";
import { config } from "../config";
import { apiLimiter } from "./middleware/rateLimit";
import walletRoutes from "./routes/wallet";
import paymentRoutes from "./routes/payment";
import payoutRoutes from "./routes/payout";
import transactionRoutes from "./routes/transactions";
import anchorRoutes from "./routes/anchor";
import treasuryRoutes from "./routes/treasury";
import webhookRoutes from "./routes/webhooks";
import merchantRoutes from "./routes/merchant";
import checkoutRoutes from "./routes/checkout";
import swapRoutes from "./routes/swap";
import yieldRoutes from "./routes/yield";
import onrampRoutes from "./routes/onramp";
import eventsRoutes from "./routes/events";
import blockchainWebhookRoutes from "./routes/blockchainWebhook";
import metricsRoutes from "./routes/metrics";
import authRoutes from "./routes/auth";
import organizationRoutes from "./routes/organizations";
import apikeyRoutes from "./routes/apikey";
import billingRoutes from "./routes/billing";
import usageRoutes from "./routes/usage";
import "../auth/passport";

const app = express();

app.use(helmet());
app.use(cors({ origin: config.oauth.frontendUrl, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(apiLimiter);
app.use(passport.initialize());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "paykit-core" });
});

app.use("/auth", authRoutes);
app.use("/organizations", organizationRoutes);
app.use("/apikey", apikeyRoutes);
app.use("/billing", billingRoutes);
app.use("/usage", usageRoutes);
app.use("/wallet", walletRoutes);
app.use("/payment", paymentRoutes);
app.use("/payout", payoutRoutes);
app.use("/transactions", transactionRoutes);
app.use("/anchor", anchorRoutes);
app.use("/treasury", treasuryRoutes);
app.use("/webhooks", webhookRoutes);
app.use("/merchant", merchantRoutes);
app.use("/checkout", checkoutRoutes);
app.use("/swap", swapRoutes);
app.use("/yield", yieldRoutes);
app.use("/onramp", onrampRoutes);
app.use("/events", eventsRoutes);
app.use("/blockchain/webhook", blockchainWebhookRoutes);
app.use("/metrics", metricsRoutes);

export default app;
