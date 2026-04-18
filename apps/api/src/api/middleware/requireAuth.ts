import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../../auth/jwt";

export interface AuthRequest extends Request {
  userId?: string;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.header("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : (req.query.token as string | undefined);
  if (!token) {
    res.status(401).json({ error: "Authentication required. Use Authorization: Bearer <token>." });
    return;
  }
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token." });
    return;
  }
  req.userId = payload.userId;
  next();
}
