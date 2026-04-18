import { Router, Request, Response } from "express";
import { CheckoutSession } from "../../database/models";

const router = Router();

router.get("/status/:sessionId", async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const session = await CheckoutSession.findById(sessionId)
      .select("status amount asset walletAddress description completedAt txHash expiresAt")
      .lean()
      .exec();
    if (!session) {
      res.status(404).json({ error: "Checkout session not found" });
      return;
    }
    res.json({
      id: session._id.toString(),
      status: session.status,
      amount: session.amount,
      asset: session.asset,
      walletAddress: session.walletAddress,
      description: session.description,
      completedAt: session.completedAt,
      txHash: session.txHash,
      expiresAt: session.expiresAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get checkout status";
    res.status(500).json({ error: message });
  }
});

export default router;
