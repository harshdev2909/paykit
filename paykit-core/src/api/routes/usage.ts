import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { getUsageForMonth } from "../../services/usageService";
import { OrganizationMember } from "../../database/models";
import type { AuthRequest } from "../middleware/requireAuth";

const router = Router();
router.use(requireAuth);

router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).userId;
    const orgId = (req.query.organizationId as string) || null;
    const month = req.query.month as string | undefined;
    let targetOrgId = orgId;
    if (!targetOrgId) {
      const first = await OrganizationMember.findOne({ userId }).exec();
      targetOrgId = first ? String(first.organizationId) : null;
    }
    if (!targetOrgId) {
      res.status(400).json({ error: "No organization." });
      return;
    }
    const usage = await getUsageForMonth(targetOrgId, month);
    res.json({ usage });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get usage";
    res.status(500).json({ error: message });
  }
});

export default router;
