import { Router, Request, Response, NextFunction } from "express";
import { createMerchant, getMerchantById, createCheckoutSession } from "../../merchant/merchantService";
import { verifyApiKey } from "../middleware/verifyApiKey";
import { merchantRateLimit } from "../middleware/merchantRateLimit";

const router = Router();

const RESERVED_MERCHANT_PATHS = ["create", "checkout"];

router.post("/create", async (req: Request, res: Response) => {
  try {
    const { name, webhookUrl } = req.body;
    if (!name || typeof name !== "string") {
      res.status(400).json({ error: "Missing or invalid field: name" });
      return;
    }
    const result = await createMerchant(name.trim(), webhookUrl ? String(webhookUrl) : undefined);
    res.status(201).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Merchant creation failed";
    res.status(500).json({ error: message });
  }
});

router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  if (RESERVED_MERCHANT_PATHS.includes(req.params.id)) {
    return next();
  }
  try {
    const merchant = await getMerchantById(req.params.id);
    if (!merchant) {
      res.status(404).json({ error: "Merchant not found" });
      return;
    }
    res.json(merchant);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get merchant";
    res.status(500).json({ error: message });
  }
});

router.use(verifyApiKey);
router.use(merchantRateLimit);

router.post("/checkout/create", async (req: Request, res: Response) => {
  try {
    const merchantId = (req as Request & { merchantId: string }).merchantId;
    const { amount, asset, success_url, cancel_url, description, auto_yield } = req.body;
    if (!amount || !asset) {
      res.status(400).json({ error: "Missing required fields: amount, asset" });
      return;
    }
    const result = await createCheckoutSession({
      merchantId,
      amount: String(amount),
      asset: String(asset),
      successUrl: success_url ? String(success_url) : undefined,
      cancelUrl: cancel_url ? String(cancel_url) : undefined,
      description: description ? String(description) : undefined,
      autoYield: Boolean(auto_yield),
    });
    res.status(201).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout creation failed";
    res.status(500).json({ error: message });
  }
});

export default router;
