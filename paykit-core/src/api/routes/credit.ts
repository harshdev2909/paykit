import { Router, Request, Response } from "express";
import { getLimit, borrow, repay } from "../../services/creditService";

const router = Router();

router.get("/limit", async (req: Request, res: Response) => {
  try {
    const treasuryAccountId = req.query.treasuryAccountId as string;
    if (!treasuryAccountId) {
      res.status(400).json({ error: "Missing query: treasuryAccountId" });
      return;
    }
    const result = await getLimit(treasuryAccountId);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get credit limit";
    res.status(400).json({ error: message });
  }
});

router.post("/borrow", async (req: Request, res: Response) => {
  try {
    const { treasuryAccountId, amount } = req.body as { treasuryAccountId: string; amount: string };
    if (!treasuryAccountId || amount == null) {
      res.status(400).json({ error: "Missing treasuryAccountId or amount" });
      return;
    }
    const result = await borrow({ treasuryAccountId, amount: String(amount) });
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Borrow failed";
    res.status(400).json({ error: message });
  }
});

router.post("/repay", async (req: Request, res: Response) => {
  try {
    const { treasuryAccountId, amount } = req.body as { treasuryAccountId: string; amount: string };
    if (!treasuryAccountId || amount == null) {
      res.status(400).json({ error: "Missing treasuryAccountId or amount" });
      return;
    }
    const result = await repay({ treasuryAccountId, amount: String(amount) });
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Repay failed";
    res.status(400).json({ error: message });
  }
});

export default router;
