import { Request, Response, NextFunction } from "express";
import { getMerchantByApiKey } from "../../merchant/merchantService";
import { findOrganizationByApiKey } from "../../services/apiKeyService";

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

export interface MerchantRequest extends Request {
  merchantId?: string;
  merchantName?: string;
  organizationId?: string;
}

export async function verifyOrgOrMerchantKey(req: MerchantRequest, res: Response, next: NextFunction): Promise<void> {
  const apiKey = getApiKeyFromRequest(req);
  if (!apiKey) {
    res.status(401).json({ error: "Missing API key. Provide x-api-key header or Authorization: Bearer <key>." });
    return;
  }
  try {
    const merchant = await getMerchantByApiKey(apiKey);
    if (merchant) {
      req.merchantId = merchant.id;
      req.merchantName = merchant.name;
      next();
      return;
    }
    const org = await findOrganizationByApiKey(apiKey);
    if (org) {
      req.organizationId = org.organizationId;
      if (org.defaultMerchantId) {
        const { getMerchantById } = await import("../../merchant/merchantService");
        const defaultMerchant = await getMerchantById(org.defaultMerchantId);
        if (defaultMerchant) {
          req.merchantId = defaultMerchant.id;
          req.merchantName = defaultMerchant.name;
        }
      }
      next();
      return;
    }
    res.status(401).json({ error: "Invalid API key." });
  } catch (err) {
    next(err);
  }
}
