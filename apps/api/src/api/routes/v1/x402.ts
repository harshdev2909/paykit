import { Router, Response } from "express";
import { z } from "zod";
import { verifyApiKey } from "../../middleware/verifyApiKey";
import { createReceipt } from "../../../services/receiptService";
import { queueWebhookEvent } from "../../../services/webhookService";
import { getSupportedCached } from "../../../services/x402Supported";

const router = Router();

router.get("/supported", (_req, res: Response) => {
  res.json(getSupportedCached());
});

const verifyBody = z.object({
  paymentHeader: z.string().min(1),
  resource: z.string().optional(),
  domain: z.string().optional(),
});

router.post("/verify", verifyApiKey, async (req, res: Response) => {
  try {
    const merchantId = req.merchantId!;
    const parsed = verifyBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const header = parsed.data.paymentHeader.trim();
    let decodedBytes = 0;
    try {
      decodedBytes = Buffer.from(header, "base64").length;
    } catch {
      decodedBytes = 0;
    }
    const valid = decodedBytes > 0 || header.startsWith("0x");
    await queueWebhookEvent(
      "x402.verified",
      {
        merchant_id: merchantId,
        resource: parsed.data.resource,
        domain: parsed.data.domain,
        valid,
      },
      undefined,
    ).catch(() => {});
    res.json({
      valid,
      details: {
        headerLength: header.length,
        resource: parsed.data.resource ?? null,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "failed" });
  }
});

const settleBody = z.object({
  walletFrom: z.string().min(1),
  walletTo: z.string().min(1),
  asset: z.string().min(1),
  amount: z.string().min(1),
  domain: z.string().optional(),
  path: z.string().optional(),
  x402Nonce: z.string().optional(),
  facilitatorTxHash: z.string().optional(),
  stellarTxHash: z.string().optional(),
  signedReceipt: z.string().optional(),
});

router.post("/settle", verifyApiKey, async (req, res: Response) => {
  try {
    const merchantId = req.merchantId!;
    const parsed = settleBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const row = await createReceipt({
      merchantId,
      walletFrom: parsed.data.walletFrom,
      walletTo: parsed.data.walletTo,
      asset: parsed.data.asset,
      amount: parsed.data.amount,
      domain: parsed.data.domain,
      path: parsed.data.path,
      x402Nonce: parsed.data.x402Nonce,
      facilitatorTxHash: parsed.data.facilitatorTxHash,
      stellarTxHash: parsed.data.stellarTxHash,
      signedReceipt: parsed.data.signedReceipt,
      status: "settled",
    });
    res.status(201).json({
      id: row.id,
      status: row.status,
      createdAt: row.createdAt,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "failed" });
  }
});

export default router;
