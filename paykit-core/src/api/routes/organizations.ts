import { Router, Request, Response } from "express";
import { Organization, OrganizationMember } from "../../database/models";
import { requireAuth } from "../middleware/requireAuth";
import type { AuthRequest } from "../middleware/requireAuth";

const router = Router();
router.use(requireAuth);

router.post("/", async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).userId;
    const { name } = req.body;
    if (!name || typeof name !== "string") {
      res.status(400).json({ error: "Missing or invalid field: name" });
      return;
    }
    const org = await Organization.create({
      name: name.trim(),
      ownerId: userId,
      plan: "free",
    });
    await OrganizationMember.create({
      organizationId: org._id,
      userId,
      role: "owner",
    });
    res.status(201).json({
      id: org._id.toString(),
      name: org.name,
      ownerId: org.ownerId.toString(),
      plan: org.plan,
      createdAt: org.createdAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create organization";
    res.status(500).json({ error: message });
  }
});

router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).userId;
    const memberships = await OrganizationMember.find({ userId })
      .populate("organizationId", "name ownerId plan createdAt")
      .lean()
      .exec();
    const orgs = memberships.map((m) => {
      const ref = m as unknown as { organizationId: { _id: { toString(): string }; name: string; ownerId: { toString(): string }; plan: string; createdAt: Date } };
      const org = ref.organizationId;
      return {
        id: org._id.toString(),
        name: org.name,
        ownerId: org.ownerId?.toString(),
        plan: org.plan,
        createdAt: org.createdAt,
      };
    });
    res.json({ organizations: orgs });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list organizations";
    res.status(500).json({ error: message });
  }
});

export default router;
