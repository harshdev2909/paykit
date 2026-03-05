import { Request, Response, NextFunction } from "express";
import { Plan } from "../../database/models";
import { getUsageForMonth } from "../../services/usageService";
import type { MerchantRequest } from "./verifyOrgOrMerchantKey";

export async function checkPlanLimits(req: MerchantRequest, res: Response, next: NextFunction): Promise<void> {
  const orgId = req.organizationId;
  if (!orgId) {
    return next();
  }
  try {
    const org = await import("../../database/models").then((m) => m.Organization.findById(orgId).lean().exec());
    if (!org) return next();
    const planSlug = (org as { plan: string }).plan ?? "free";
    const plan = await Plan.findOne({ slug: planSlug }).lean().exec();
    if (!plan) return next();
    const limit = (plan as { apiRequestsPerMonth: number }).apiRequestsPerMonth;
    if (limit < 0) return next();
    const usage = await getUsageForMonth(orgId);
    if (usage.apiCalls >= limit) {
      res.status(429).json({ error: "Plan API limit exceeded for this month. Upgrade to continue." });
      return;
    }
    next();
  } catch (err) {
    next(err);
  }
}
