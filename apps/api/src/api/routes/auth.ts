import { Router, Request, Response } from "express";
import passport from "passport";
import { User } from "../../database/models";
import { signToken } from "../../auth/jwt";
import { config } from "../../config";

const router = Router();
const RETURN_TO_COOKIE = "paykit_return_to";
const COOKIE_OPTS = { httpOnly: true, maxAge: 300, path: "/", sameSite: "lax" as const };

router.get("/google", (req, res, next) => {
  const returnTo = (req.query.returnTo as string) || "developers";
  res.cookie(RETURN_TO_COOKIE, returnTo, COOKIE_OPTS);
  passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
});

router.get(
  "/callback/google",
  passport.authenticate("google", { session: false }),
  (req: Request, res: Response) => {
    const user = req.user as { id: string; email?: string; name?: string; plan: string };
    const token = signToken({ userId: user.id, email: user.email, plan: user.plan });
    const returnTo = (req.cookies?.[RETURN_TO_COOKIE] as string) || "developers";
    res.clearCookie(RETURN_TO_COOKIE, { path: "/" });
    const path = returnTo.startsWith("/") ? returnTo : `/${returnTo}`;
    const redirect = `${config.oauth.frontendUrl.replace(/\/$/, "")}${path}?token=${encodeURIComponent(token)}`;
    res.redirect(redirect);
  }
);

router.post("/logout", (_req: Request, res: Response) => {
  res.clearCookie("paykit.sid");
  res.json({ ok: true });
});

router.get("/me", async (req: Request, res: Response) => {
  const authHeader = req.header("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : req.query.token as string | undefined;
  if (!token) {
    res.status(401).json({ error: "Missing token. Use Authorization: Bearer <token> or ?token=." });
    return;
  }
  const { verifyToken } = await import("../../auth/jwt");
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token." });
    return;
  }
  const user = await User.findById(payload.userId).select("email name provider plan createdAt").lean().exec();
  if (!user) {
    res.status(401).json({ error: "User not found." });
    return;
  }
  const u = user as { _id: { toString(): string }; email?: string; name?: string; provider?: string; plan?: string; createdAt: Date };
  res.json({
    id: u._id.toString(),
    email: u.email,
    name: u.name,
    provider: u.provider,
    plan: u.plan ?? "free",
    createdAt: u.createdAt,
  });
});

export default router;
