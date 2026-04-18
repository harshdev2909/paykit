import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import passport from "passport";
import { config } from "../config";
import { apiLimiter } from "./middleware/rateLimit";
import walletRoutes from "./routes/wallet";
import transactionRoutes from "./routes/transactions";
import webhookRoutes from "./routes/webhooks";
import merchantRoutes from "./routes/merchant";
import checkoutRoutes from "./routes/checkout";
import blockchainWebhookRoutes from "./routes/blockchainWebhook";
import v1WalletRoutes from "./routes/v1/wallets";
import v1X402Routes from "./routes/v1/x402";
import v1ReceiptRoutes from "./routes/v1/receipts";
import v1WebhookRoutes from "./routes/v1/webhooks";
import eventsStreamRoutes from "./routes/eventsStream";
import demoEchoRoutes from "./routes/demoEcho";
import v1DemoRoutes from "./routes/v1/demo";
import authRoutes from "./routes/auth";
import organizationRoutes from "./routes/organizations";
import apikeyRoutes from "./routes/apikey";
import "../auth/passport";

const app = express();

app.use(helmet());
const corsOptions: cors.CorsOptions = {
  origin: (origin, cb) => {
    const allowed = config.cors.allowedOrigins;
    if (!origin || allowed.length === 0) return cb(null, true);
    if (allowed.includes(origin) || allowed.includes("*")) return cb(null, true);
    cb(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-api-key", "Idempotency-Key"],
};
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use(apiLimiter);
app.use(passport.initialize());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "paykit-api" });
});

app.use("/auth", authRoutes);
app.use("/organizations", organizationRoutes);
app.use("/apikey", apikeyRoutes);
app.use("/wallet", walletRoutes);
app.use("/transactions", transactionRoutes);
app.use("/webhooks", webhookRoutes);
app.use("/merchant", merchantRoutes);
app.use("/checkout", checkoutRoutes);
app.use("/blockchain/webhook", blockchainWebhookRoutes);

app.use("/demo/echo", demoEchoRoutes);

app.use("/v1/wallets", v1WalletRoutes);
app.use("/v1/x402", v1X402Routes);
app.use("/v1/receipts", v1ReceiptRoutes);
app.use("/v1/webhooks", v1WebhookRoutes);
app.use("/v1/demo", v1DemoRoutes);
app.use("/events", eventsStreamRoutes);

export default app;
