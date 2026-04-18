import { Request, Response, NextFunction } from "express";
import { getMerchantByApiKey } from "../../merchant/merchantService";

const HEADER_API_KEY = "x-api-key";
const AUTH_HEADER = "authorization";

function getApiKeyFromRequest(req: Request): string | null {
  const header = req.header(HEADER_API_KEY) ?? req.header(AUTH_HEADER);
  if (!header || typeof header !== "string") return null;
  if (header.toLowerCase().startsWith("bearer ")) {
    return header.slice(7).trim();
  }
  return header.trim();
}

export async function verifyApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
  const apiKey = getApiKeyFromRequest(req);
  if (!apiKey) {
    res.status(401).json({ error: "Missing API key. Provide x-api-key header or Authorization: Bearer <key>." });
    return;
  }
  try {
    const merchant = await getMerchantByApiKey(apiKey);
    if (!merchant) {
      res.status(401).json({ error: "Invalid API key." });
      return;
    }
    (req as Request & { merchantId: string; merchantName: string }).merchantId = merchant.id;
    (req as Request & { merchantId: string; merchantName: string }).merchantName = merchant.name;
    next();
  } catch (err) {
    next(err);
  }
}
