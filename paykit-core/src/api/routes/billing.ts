import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { Plan, Organization, OrganizationMember } from "../../database/models";
import type { AuthRequest } from "../middleware/requireAuth";

const router = Router();
router.use(requireAuth);

router.get("/plan", async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).userId;
    const orgId = (req.query.organizationId as string) || null;
    let targetOrgId = orgId;
    if (!targetOrgId) {
      const first = await OrganizationMember.findOne({ userId }).exec();
      targetOrgId = first ? String(first.organizationId) : null;
    }
    if (!targetOrgId) {
      res.status(400).json({ error: "No organization. Create one first." });
      return;
    }
    const org = await Organization.findById(targetOrgId).lean().exec();
    if (!org) {
      res.status(404).json({ error: "Organization not found." });
      return;
    }
    const planSlug = (org as { plan: string }).plan ?? "free";
    const plan = await Plan.findOne({ slug: planSlug }).lean().exec();
    if (!plan) {
      res.json({ plan: planSlug, name: planSlug, price: 0, limits: {} });
      return;
    }
    const p = plan as { slug: string; name: string; price: number; rateLimitPerSec: number; apiRequestsPerMonth: number };
    res.json({
      plan: p.slug,
      name: p.name,
      price: p.price,
      rateLimitPerSec: p.rateLimitPerSec,
      apiRequestsPerMonth: p.apiRequestsPerMonth,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get plan";
    res.status(500).json({ error: message });
  }
});

router.post("/upgrade", async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).userId;
    const { organizationId, plan } = req.body;
    const targetOrgId = organizationId || (await OrganizationMember.findOne({ userId }).then((m) => (m ? String(m.organizationId) : null)));
    if (!targetOrgId) {
      res.status(400).json({ error: "Organization required." });
      return;
    }
    const member = await OrganizationMember.findOne({ organizationId: targetOrgId, userId }).exec();
    if (!member || (member.role as string) !== "owner") {
      res.status(403).json({ error: "Only organization owner can upgrade." });
      return;
    }
    const validPlan = ["free", "pro", "premium", "enterprise"].includes(plan) ? plan : "free";
    await Organization.updateOne({ _id: targetOrgId }, { $set: { plan: validPlan } }).exec();
    res.json({ ok: true, plan: validPlan });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to upgrade";
    res.status(500).json({ error: message });
  }
});

router.post("/cancel", async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).userId;
    const { organizationId } = req.body;
    const targetOrgId = organizationId || (await OrganizationMember.findOne({ userId }).then((m) => (m ? String(m.organizationId) : null)));
    if (!targetOrgId) {
      res.status(400).json({ error: "Organization required." });
      return;
    }
    const member = await OrganizationMember.findOne({ organizationId: targetOrgId, userId }).exec();
    if (!member || (member.role as string) !== "owner") {
      res.status(403).json({ error: "Only organization owner can cancel." });
      return;
    }
    await Organization.updateOne({ _id: targetOrgId }, { $set: { plan: "free" } }).exec();
    res.json({ ok: true, plan: "free" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to cancel";
    res.status(500).json({ error: message });
  }
});

export default router;
