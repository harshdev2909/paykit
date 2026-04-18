import { Router, Response } from "express";
import { z } from "zod";
import { verifyApiKey } from "../../middleware/verifyApiKey";
import {
  createAgentWallet,
  fundAgentWallet,
  getAgentWalletWithBalances,
  listAgentWallets,
  signHexMessage,
  updateAgentWalletPolicy,
} from "../../../services/agentWalletService";

const router = Router();
router.use(verifyApiKey);

const createWalletBody = z.object({
  agentPolicy: z.record(z.string(), z.unknown()).optional(),
});

const patchWalletBody = z.object({
  agentPolicy: z.record(z.string(), z.unknown()),
});

router.get("/", async (req, res: Response) => {
  try {
    const merchantId = req.merchantId!;
    const rows = await listAgentWallets(merchantId);
    res.json({ wallets: rows });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "failed" });
  }
});

router.post("/", async (req, res: Response) => {
  try {
    const merchantId = req.merchantId!;
    const parsed = createWalletBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const created = await createAgentWallet(merchantId);
    if (parsed.data.agentPolicy) {
      await updateAgentWalletPolicy(created.id, merchantId, parsed.data.agentPolicy);
    }
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "failed" });
  }
});

router.get("/:id", async (req, res: Response) => {
  try {
    const merchantId = req.merchantId!;
    const row = await getAgentWalletWithBalances(req.params.id, merchantId);
    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "failed" });
  }
});

router.patch("/:id", async (req, res: Response) => {
  try {
    const merchantId = req.merchantId!;
    const parsed = patchWalletBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const updated = await updateAgentWalletPolicy(
      req.params.id,
      merchantId,
      parsed.data.agentPolicy,
    );
    if (!updated) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "failed" });
  }
});

const policyPostBody = z.record(z.string(), z.unknown());

router.post("/:id/policy", async (req, res: Response) => {
  try {
    const merchantId = req.merchantId!;
    const parsed = policyPostBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const updated = await updateAgentWalletPolicy(req.params.id, merchantId, parsed.data);
    if (!updated) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "failed" });
  }
});

router.post("/:id/fund", async (req, res: Response) => {
  try {
    const merchantId = req.merchantId!;
    await fundAgentWallet(req.params.id, merchantId);
    res.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "failed";
    res.status(msg.includes("not found") ? 404 : 500).json({ error: msg });
  }
});

const signSchema = z.object({
  messageHex: z.string().min(2),
});

router.post("/:id/sign", async (req, res: Response) => {
  try {
    const merchantId = req.merchantId!;
    const parsed = signSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const sig = await signHexMessage(req.params.id, merchantId, parsed.data.messageHex);
    res.json({
      signature: sig.toString("hex"),
      scheme: "ed25519",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "failed";
    res.status(msg.includes("not found") ? 404 : 500).json({ error: msg });
  }
});

export default router;
