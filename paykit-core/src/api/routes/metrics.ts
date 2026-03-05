import { Router, Request, Response } from "express";
import { getMetricsSnapshot } from "../../services/observability";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    const snapshot = await getMetricsSnapshot();
    res.json({
      transactionSuccesses: snapshot.transactionSuccesses,
      transactionFailures: snapshot.transactionFailures,
      apiLatencySamples: snapshot.apiLatencySamples,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get metrics";
    res.status(500).json({ error: message });
  }
});

export default router;
