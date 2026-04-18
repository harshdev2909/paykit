import { Router, Response } from "express";
import { z } from "zod";
import { verifyApiKey } from "../../middleware/verifyApiKey";
import { getReceiptForMerchant, listReceiptsForMerchant } from "../../../services/receiptService";

const router = Router();
router.use(verifyApiKey);

const listQuery = z.object({
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional(),
});

router.get("/", async (req, res: Response) => {
  try {
    const merchantId = req.merchantId!;
    const parsed = listQuery.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const { receipts } = await listReceiptsForMerchant(merchantId, {
      limit: parsed.data.limit ?? 20,
      offset: parsed.data.offset ?? 0,
    });
    res.json({ receipts });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "failed" });
  }
});

router.get("/:id", async (req, res: Response) => {
  try {
    const merchantId = req.merchantId!;
    const row = await getReceiptForMerchant(req.params.id, merchantId);
    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "failed" });
  }
});

export default router;
