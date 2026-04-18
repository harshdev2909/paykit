-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "receipts" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "apiKeyId" TEXT,
    "walletFrom" TEXT NOT NULL,
    "walletTo" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "domain" TEXT,
    "path" TEXT,
    "x402_nonce" TEXT,
    "facilitator_tx_hash" TEXT,
    "stellar_tx_hash" TEXT,
    "status" TEXT NOT NULL,
    "signed_receipt" TEXT,
    "settled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_deliveries" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT,
    "subscriptionId" TEXT,
    "merchantId" TEXT,
    "url" TEXT NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "lastAttemptAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchant_receipt_signing_keys" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "kid" TEXT,
    "algorithm" TEXT NOT NULL DEFAULT 'EdDSA',
    "public_key_jwk" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "merchant_receipt_signing_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "receipts_merchantId_idx" ON "receipts"("merchantId");

-- CreateIndex
CREATE INDEX "receipts_merchantId_created_at_idx" ON "receipts"("merchantId", "created_at");

-- CreateIndex
CREATE INDEX "webhook_deliveries_merchantId_idx" ON "webhook_deliveries"("merchantId");

-- CreateIndex
CREATE UNIQUE INDEX "merchant_receipt_signing_keys_merchantId_kid_key" ON "merchant_receipt_signing_keys"("merchantId", "kid");

-- AddForeignKey
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "receipts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
