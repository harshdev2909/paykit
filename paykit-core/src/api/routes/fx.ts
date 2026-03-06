import { Router, Request, Response } from "express";
import { getFxQuote } from "../../services/fxService";

const router = Router();

router.get("/quote", async (req: Request, res: Response) => {
  try {
    const { from, to, amount, walletId } = req.query as {
      from: string;
      to: string;
      amount: string;
      walletId?: string;
    };
    if (!from || !to || amount == null) {
      res.status(400).json({ error: "Missing from, to, or amount" });
      return;
    }
    const result = await getFxQuote({ from, to, amount, walletId });
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "FX quote failed";
    res.status(400).json({ error: message });
  }
});

export default router;
