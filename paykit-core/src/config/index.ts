import dotenv from "dotenv";

dotenv.config();

export const config = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: parseInt(process.env.PORT ?? "3000", 10),

  stellar: {
    network: process.env.STELLAR_NETWORK ?? "testnet",
    horizonUrl: process.env.HORIZON_URL ?? "https://horizon-testnet.stellar.org",
    friendbotUrl: process.env.FRIENDBOT_URL ?? "https://friendbot.stellar.org",
    usdcIssuer: process.env.STELLAR_USDC_ISSUER ?? "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
    pyusdIssuer: process.env.STELLAR_PYUSD_ISSUER ?? "",
  },
  webhook: {
    maxRetries: parseInt(process.env.WEBHOOK_MAX_RETRIES ?? "3", 10),
    retryDelayMs: parseInt(process.env.WEBHOOK_RETRY_DELAY_MS ?? "5000", 10),
  },
  txQueue: {
    key: process.env.TX_QUEUE_KEY ?? "paykit:tx_queue",
    maxRetries: parseInt(process.env.TX_MAX_RETRIES ?? "5", 10),
  },

  mongo: {
    uri: process.env.MONGODB_URI ?? "mongodb://localhost:27017/paykit",
  },

  redis: {
    url: process.env.REDIS_URL ?? "redis://localhost:6379",
  },

  wallet: {
    encryptionKey: process.env.WALLET_ENCRYPTION_KEY ?? "",
  },

  idempotency: {
    ttlSeconds: parseInt(process.env.IDEMPOTENCY_TTL ?? "86400", 10),
  },
  merchant: {
    baseUrl: process.env.PAYKIT_BASE_URL ?? "https://paykit.io",
    defaultMaxPaymentAmount: process.env.MERCHANT_MAX_PAYMENT_AMOUNT ?? "1000000",
  },
  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    },
    frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:3001",
    callbackBaseUrl: process.env.PAYKIT_API_URL ?? process.env.BACKEND_URL ?? "http://localhost:3000",
  },
  session: {
    secret: process.env.SESSION_SECRET ?? "paykit-session-secret-change-in-production",
    cookieMaxAge: 7 * 24 * 60 * 60 * 1000,
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? process.env.SESSION_SECRET ?? "paykit-jwt-secret-change-in-production",
    expiresIn: "7d",
  },
} as const;

export function requireEncryptionKey(): void {
  if (!config.wallet.encryptionKey || config.wallet.encryptionKey.length !== 64) {
    throw new Error(
      "WALLET_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). " +
        "Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
}
