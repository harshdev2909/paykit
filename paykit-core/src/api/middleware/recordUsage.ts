import { Request, Response, NextFunction } from "express";
import { recordApiCall } from "../../services/usageService";
import type { MerchantRequest } from "./verifyOrgOrMerchantKey";

export async function recordUsage(req: MerchantRequest, res: Response, next: NextFunction): Promise<void> {
  const orgId = req.organizationId;
  if (orgId) {
    recordApiCall(orgId).catch(() => {});
  }
  next();
}
