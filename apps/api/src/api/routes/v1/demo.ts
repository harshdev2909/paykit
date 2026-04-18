import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { verifyApiKey } from "../../middleware/verifyApiKey";
import {
  createAgentWallet,
  fundAgentWallet,
  updateAgentWalletPolicy,
} from "../../../services/agentWalletService";
import {
  ensureDemoNativeTopUp,
  ensureDemoUsdcTopUpFromSettlement,
} from "../../../services/demoWalletFunding";
import { ensureTrustlineIfNeeded } from "../../../services/trustlineService";
import { ensureSettlementWalletId, ensureDemoMerchant } from "../../../merchant/merchantService";
import { Wallet } from "../../../database/models";
import { submitWalletPayment } from "../../../services/stellarPayment";
import { executeDemoPrompt, type DemoPreset } from "../../../services/demoExecutionService";

const router = Router();

function apiKeyFromReq(req: Request): string {
  const header = req.header("x-api-key") ?? req.header("authorization");
  if (!header || typeof header !== "string") return "";
  if (header.toLowerCase().startsWith("bearer ")) {
    return header.slice(7).trim();
  }
  return header.trim();
}

function clientIp(req: Request): string {
  const xf = req.header("x-forwarded-for");
  if (xf?.trim()) return xf.split(",")[0]?.trim() ?? "";
  const ri = req.socket.remoteAddress ?? "";
  return ri.replace(/^::ffff:/, "");
}

async function findProvisionedDemoWallet(
  merchantId: string,
  ip: string,
): Promise<{ id: string; publicKey: string } | null> {
  if (!ip.trim()) return null;
  const oid = new mongoose.Types.ObjectId(merchantId);
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const rows = await Wallet.find({
    merchantId: oid,
    kind: "agent",
    "agentPolicy.demoClientIp": ip,
  })
    .select("publicKey agentPolicy createdAt")
    .sort({ createdAt: -1 })
    .limit(5)
    .lean()
    .exec();

  for (const w of rows) {
    const issuedRaw = (w.agentPolicy as Record<string, unknown> | undefined)?.demoWalletIssuedAt;
    const issued =
      typeof issuedRaw === "string" && issuedRaw.length > 0 ? new Date(issuedRaw).getTime() : NaN;
    const created = w.createdAt instanceof Date ? w.createdAt.getTime() : NaN;
    const t = Number.isFinite(issued) ? issued : Number.isFinite(created) ? created : 0;
    if (t >= cutoff) {
      return { id: String(w._id), publicKey: w.publicKey };
    }
  }
  return null;
}

/** Public: provisions or returns demo agent wallet for this IP (24h). */
router.post("/wallet", async (req: Request, res: Response) => {
  try {
    const demo = await ensureDemoMerchant();
    const merchantId = demo.id;
    const ip = clientIp(req);

    const existing = await findProvisionedDemoWallet(merchantId, ip);
    if (existing) {
      try {
        await ensureDemoNativeTopUp(existing.id, merchantId);
        await ensureTrustlineIfNeeded(existing.id, "USDC");
        await ensureDemoUsdcTopUpFromSettlement(existing.id, merchantId, 0.05);
      } catch (err) {
        console.warn("[demo] wallet prefund/trustline failed", err);
      }
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      res.json({
        walletId: existing.id,
        cAddress: existing.publicKey,
        expiresAt,
      });
      return;
    }

    const created = await createAgentWallet(merchantId);
    const issuedAt = new Date().toISOString();
    await updateAgentWalletPolicy(created.id, merchantId, {
      dailyCap: "0.50",
      allowedDomains: ["paykit-1.onrender.com"],
      demoWindowStart: issuedAt,
      demoSpentUsdc: "0",
      demoPromptCount: "0",
      demoClientIp: ip,
      demoWalletIssuedAt: issuedAt,
    });
    await fundAgentWallet(created.id, merchantId);
    try {
      await ensureDemoNativeTopUp(created.id, merchantId);
      await ensureTrustlineIfNeeded(created.id, "USDC");
      await ensureDemoUsdcTopUpFromSettlement(created.id, merchantId, 0.05);
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
      console.warn("[demo] demo USDC transfer failed (settlement wallet may lack USDC)", err);
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    res.status(201).json({
      walletId: created.id,
      cAddress: created.publicKey,
      expiresAt,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "wallet_failed" });
  }
});

const promptBody = z.object({
  walletId: z.string().min(8),
  preset: z.enum(["btc", "translate", "summarize", "expensive"]),
  input: z
    .object({
      text: z.string().optional(),
      target: z.string().optional(),
      url: z.string().optional(),
    })
    .optional(),
});

router.post("/prompt", verifyApiKey, async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId!;
    const parsed = promptBody.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.issues
        .map((i) => `${i.path.join(".") || "body"}: ${i.message}`)
        .join("; ");
      res.status(400).json({ error: "validation_failed", message });
      return;
    }
    const apiKey = apiKeyFromReq(req);
    if (!apiKey) {
      res.status(401).json({ error: "Missing API key" });
      return;
    }

    const walletDoc = await Wallet.findById(parsed.data.walletId).exec();
    if (!walletDoc || walletDoc.kind !== "agent") {
      res.status(404).json({ error: "Wallet not found" });
      return;
    }
    const agentPolicy = { ...(walletDoc.agentPolicy ?? {}) } as Record<string, unknown>;

    const rawStart = agentPolicy.demoWindowStart;
    let windowStart =
      typeof rawStart === "string" && rawStart.length > 0 ? new Date(rawStart) : new Date();
    if (Number.isNaN(windowStart.getTime())) windowStart = new Date();
    const elapsed = Date.now() - windowStart.getTime();
    const hours24 = 24 * 60 * 60 * 1000;
    let promptCount =
      typeof agentPolicy.demoPromptCount === "string"
        ? parseInt(agentPolicy.demoPromptCount || "0", 10)
        : typeof agentPolicy.demoPromptCount === "number"
          ? agentPolicy.demoPromptCount
          : 0;
    if (!Number.isFinite(promptCount)) promptCount = 0;
    if (elapsed >= hours24) {
      promptCount = 0;
    }

    if (promptCount >= 20) {
      const resetMs = windowStart.getTime() + hours24 - Date.now();
      const mins = Math.ceil(resetMs / 60000);
      res.status(429).json({
        error: "prompt_limit",
        message: `Prompt limit reached. Wallet resets in ${Math.max(1, mins)} minutes.`,
      });
      return;
    }

    const result = await executeDemoPrompt({
      merchantId,
      walletId: parsed.data.walletId,
      preset: parsed.data.preset as DemoPreset,
      input: parsed.data.input,
      apiKey,
    });

    const fresh = await Wallet.findById(parsed.data.walletId).lean().exec();
    const merged = { ...(fresh?.agentPolicy ?? {}) } as Record<string, unknown>;
    await updateAgentWalletPolicy(parsed.data.walletId, merchantId, {
      ...merged,
      demoPromptCount: String(promptCount + 1),
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "prompt_failed" });
  }
});

router.post("/bootstrap", verifyApiKey, async (_req: Request, res: Response) => {
  try {
    const demo = await ensureDemoMerchant();
    const merchantId = demo.id;
    const created = await createAgentWallet(merchantId);
    await updateAgentWalletPolicy(created.id, merchantId, {
      dailyCap: "0.50",
      allowedDomains: ["paykit-1.onrender.com"],
      demoWindowStart: new Date().toISOString(),
      demoSpentUsdc: "0",
      demoPromptCount: "0",
    });
    await fundAgentWallet(created.id, merchantId);
    try {
      await ensureDemoNativeTopUp(created.id, merchantId);
      await ensureTrustlineIfNeeded(created.id, "USDC");
      await ensureDemoUsdcTopUpFromSettlement(created.id, merchantId, 0.05);
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
      console.warn("[demo] bootstrap USDC transfer failed", err);
    }
    res.status(201).json({
      walletId: created.id,
      publicKey: created.publicKey,
      policy: {
        dailyCap: "0.50",
        allowedDomains: ["paykit-1.onrender.com"],
      },
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "bootstrap_failed" });
  }
});

export default router;
