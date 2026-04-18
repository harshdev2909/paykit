import { Router, Request, Response } from "express";
import { z } from "zod";
import { verifyApiKey } from "../../middleware/verifyApiKey";
import {
  createAgentWallet,
  fundAgentWallet,
  updateAgentWalletPolicy,
} from "../../../services/agentWalletService";
import { establishTrustline } from "../../../services/trustlineService";
import { ensureSettlementWalletId } from "../../../merchant/merchantService";
import { Wallet } from "../../../database/models";
import { submitWalletPayment } from "../../../services/stellarPayment";
import { executeDemoPrompt } from "../../../services/demoExecutionService";

const router = Router();
router.use(verifyApiKey);

function apiKeyFromReq(req: Request): string {
  const header = req.header("x-api-key") ?? req.header("authorization");
  if (!header || typeof header !== "string") return "";
  if (header.toLowerCase().startsWith("bearer ")) {
    return header.slice(7).trim();
  }
  return header.trim();
}

router.post("/bootstrap", async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId!;
    const created = await createAgentWallet(merchantId);
    await updateAgentWalletPolicy(created.id, merchantId, {
      dailyCap: "0.50",
      allowedDomains: ["api.demo.paykit.dev"],
      demoWindowStart: new Date().toISOString(),
      demoSpentUsdc: "0",
    });
    await fundAgentWallet(created.id, merchantId);
    try {
      await establishTrustline(created.id, "USDC");
    } catch (err) {
      console.warn("[demo] USDC trustline failed", err);
    }
    try {
      const settleId = await ensureSettlementWalletId(merchantId);
      const settle = await Wallet.findById(settleId).select("publicKey").lean();
      if (settle?.publicKey) {
        await submitWalletPayment({
          fromWalletId: settleId,
          toAddress: created.publicKey,
          asset: "USDC",
          amount: "0.50",
        });
      }
    } catch (err) {
      console.warn("[demo] bootstrap USDC transfer failed (settlement wallet may lack USDC)", err);
    }
    res.status(201).json({
      walletId: created.id,
      publicKey: created.publicKey,
      policy: {
        dailyCap: "0.50",
        allowedDomains: ["api.demo.paykit.dev"],
      },
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "bootstrap_failed" });
  }
});

const promptBody = z.object({
  walletId: z.string().min(8),
  prompt: z.string().min(1).max(4000),
});

router.post("/prompt", async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId!;
    const parsed = promptBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const apiKey = apiKeyFromReq(req);
    if (!apiKey) {
      res.status(401).json({ error: "Missing API key" });
      return;
    }
    const result = await executeDemoPrompt({
      merchantId,
      walletId: parsed.data.walletId,
      prompt: parsed.data.prompt,
      apiKey,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "prompt_failed" });
  }
});

export default router;
