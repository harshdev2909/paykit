import { Router, Request, Response, NextFunction } from "express";
import {
  createMerchant,
  getMerchantById,
  createPaymentLink,
  createCheckoutSession,
  getMerchantBalances,
  executeMerchantPayout,
  getMerchantPayments,
  getMerchantAnalytics,
  getMerchantWallet,
  getMerchantWalletTransactions,
} from "../../merchant/merchantService";
import { verifyApiKey } from "../middleware/verifyApiKey";
import { merchantRateLimit } from "../middleware/merchantRateLimit";

const router = Router();

const RESERVED_MERCHANT_PATHS = ["payments", "balance", "analytics", "payout", "payment-link", "checkout", "wallet", "transactions"];

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

router.get("/payments", async (req: Request, res: Response) => {
  try {
    const merchantId = (req as Request & { merchantId: string }).merchantId;
    const limit = Math.min(parseInt(String(req.query.limit ?? "50"), 10) || 50, 100);
    const payments = await getMerchantPayments(merchantId, limit);
    res.json({ payments });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list payments";
    res.status(500).json({ error: message });
  }
});

router.get("/balance", async (req: Request, res: Response) => {
  try {
    const merchantId = (req as Request & { merchantId: string }).merchantId;
    const balances = await getMerchantBalances(merchantId);
    res.json({ balances });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get balance";
    res.status(500).json({ error: message });
  }
});

router.get("/wallet", async (req: Request, res: Response) => {
  try {
    const merchantId = (req as Request & { merchantId: string }).merchantId;
    const wallet = await getMerchantWallet(merchantId);
    if (!wallet) {
      res.status(404).json({ error: "Merchant wallet not found" });
      return;
    }
    res.json(wallet);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get merchant wallet";
    res.status(500).json({ error: message });
  }
});

router.get("/transactions", async (req: Request, res: Response) => {
  try {
    const merchantId = (req as Request & { merchantId: string }).merchantId;
    const limit = Math.min(parseInt(String(req.query.limit ?? "50"), 10) || 50, 100);
    const transactions = await getMerchantWalletTransactions(merchantId, limit);
    res.json({ transactions });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list merchant wallet transactions";
    res.status(500).json({ error: message });
  }
});

router.get("/analytics", async (req: Request, res: Response) => {
  try {
    const merchantId = (req as Request & { merchantId: string }).merchantId;
    const analytics = await getMerchantAnalytics(merchantId);
    res.json(analytics);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get analytics";
    res.status(500).json({ error: message });
  }
});

router.post("/payout", async (req: Request, res: Response) => {
  try {
    const merchantId = (req as Request & { merchantId: string }).merchantId;
    const { destination, asset, amount } = req.body;
    if (!destination || !asset || amount == null) {
      res.status(400).json({ error: "Missing required fields: destination, asset, amount" });
      return;
    }
    const result = await executeMerchantPayout({
      merchantId,
      destination: String(destination),
      asset: String(asset),
      amount: String(amount),
    });
    res.status(200).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Payout failed";
    const status = message.includes("Insufficient") ? 400 : message.includes("exceeds maximum") ? 400 : 500;
    res.status(status).json({ error: message });
  }
});

router.post("/payment-link/create", async (req: Request, res: Response) => {
  try {
    const merchantId = (req as Request & { merchantId: string }).merchantId;
    const { amount, asset, description } = req.body;
    if (!amount || !asset) {
      res.status(400).json({ error: "Missing required fields: amount, asset" });
      return;
    }
    const result = await createPaymentLink(merchantId, String(amount), String(asset), description ? String(description) : undefined);
    res.status(201).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Payment link creation failed";
    res.status(500).json({ error: message });
  }
});

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
