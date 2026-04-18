import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { createApiKey, listApiKeys, deleteApiKey } from "../../services/apiKeyService";
import { OrganizationMember } from "../../database/models";
import type { AuthRequest } from "../middleware/requireAuth";

const router = Router();
router.use(requireAuth);

async function getOrgIdForUser(req: Request, organizationId?: string): Promise<string | null> {
  const userId = (req as AuthRequest).userId;
  if (!userId) return null;
  if (organizationId) {
    const member = await OrganizationMember.findOne({ organizationId, userId }).exec();
    return member ? organizationId : null;
  }
  const first = await OrganizationMember.findOne({ userId }).exec();
  return first ? String(first.organizationId) : null;
}

router.post("/create", async (req: Request, res: Response) => {
  try {
    const orgId = await getOrgIdForUser(req, req.body.organizationId);
    if (!orgId) {
      res.status(400).json({ error: "Organization required. Create one first or pass organizationId." });
      return;
    }
    const { name } = req.body;
    const result = await createApiKey(orgId, typeof name === "string" ? name : undefined);
    res.status(201).json({
      id: result.id,
      key: result.key,
      keyPrefix: result.keyPrefix,
      message: "Store the key securely. It will not be shown again.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create API key";
    res.status(500).json({ error: message });
  }
});

router.get("/list", async (req: Request, res: Response) => {
  try {
    const orgId = await getOrgIdForUser(req, req.query.organizationId as string);
    if (!orgId) {
      res.status(400).json({ error: "Organization required." });
      return;
    }
    const keys = await listApiKeys(orgId);
    res.json({ apiKeys: keys });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list API keys";
    res.status(500).json({ error: message });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const orgId = await getOrgIdForUser(req, req.query.organizationId as string);
    if (!orgId) {
      res.status(400).json({ error: "Organization required." });
      return;
    }
    const deleted = await deleteApiKey(req.params.id, orgId);
    if (!deleted) {
      res.status(404).json({ error: "API key not found." });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete API key";
    res.status(500).json({ error: message });
  }
});

export default router;
