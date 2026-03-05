import { Router, Request, Response } from "express";
import {
  createTreasury,
  getTreasuryBalance,
  allocateTreasury,
  enableTreasuryYield,
  listTreasuriesByUserId,
} from "../../treasury/treasuryService";
import { createMultisigTreasury } from "../../treasury/multisigService";
import { requireAuth } from "../middleware/requireAuth";
import { optionalAuth } from "../middleware/optionalAuth";
import type { AuthRequest } from "../middleware/requireAuth";

const router = Router();

router.get("/list", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).userId;
    if (!userId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const treasuries = await listTreasuriesByUserId(userId);
    res.json({ treasuries });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list treasuries";
    res.status(500).json({ error: message });
  }
});

router.post("/create", optionalAuth, async (req: Request, res: Response) => {
  try {
    const name = req.body.name as string;
    if (!name || typeof name !== "string") {
      res.status(400).json({ error: "Missing or invalid field: name" });
      return;
    }
    const userId = (req as AuthRequest).userId;
    const result = await createTreasury(name, userId);
    res.status(201).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Treasury creation failed";
    res.status(500).json({ error: message });
  }
});

router.get("/balance", async (req: Request, res: Response) => {
  try {
    const treasuryAccountId = req.query.treasuryAccountId as string;
    if (!treasuryAccountId) {
      res.status(400).json({ error: "Missing query: treasuryAccountId" });
      return;
    }
    const balances = await getTreasuryBalance(treasuryAccountId);
    res.json({ balances });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get treasury balance";
    res.status(404).json({ error: message });
  }
});

router.post("/allocate", async (req: Request, res: Response) => {
  try {
    const { treasuryAccountId, assetCode, amount, destinationWalletId } = req.body;
    if (!treasuryAccountId || !assetCode || amount == null || !destinationWalletId) {
      res.status(400).json({
        error: "Missing required fields: treasuryAccountId, assetCode, amount, destinationWalletId",
      });
      return;
    }
    const result = await allocateTreasury({
      treasuryAccountId: String(treasuryAccountId),
      assetCode: String(assetCode),
      amount: String(amount),
      destinationWalletId: String(destinationWalletId),
    });
    res.status(200).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Allocation failed";
    res.status(400).json({ error: message });
  }
});

router.post("/yield/enable", async (req: Request, res: Response) => {
  try {
    const { treasuryAccountId, assetCode } = req.body;
    if (!treasuryAccountId || !assetCode) {
      res.status(400).json({ error: "Missing required fields: treasuryAccountId, assetCode" });
      return;
    }
    const result = await enableTreasuryYield(
      String(treasuryAccountId),
      String(assetCode)
    );
    res.status(200).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Yield enable failed";
    res.status(400).json({ error: message });
  }
});

router.post("/multisig/create", async (req: Request, res: Response) => {
  try {
    const { signers, threshold } = req.body;
    const name = (req.body.name as string) || "Multisig Treasury";
    if (!Array.isArray(signers) || signers.length < 2 || typeof threshold !== "number") {
      res.status(400).json({
        error: "Missing or invalid: signers (array of Stellar addresses, min 2), threshold (number)",
      });
      return;
    }
    const result = await createMultisigTreasury({
      name,
      signers: signers.map(String),
      threshold: Number(threshold),
    });
    res.status(201).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Multisig treasury creation failed";
    res.status(400).json({ error: message });
  }
});

export default router;
