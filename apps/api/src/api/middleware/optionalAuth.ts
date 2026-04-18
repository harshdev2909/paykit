import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../../auth/jwt";
import type { AuthRequest } from "./requireAuth";

/** Sets req.userId if a valid Bearer token is present; never returns 401. */
export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.header("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : (req.query.token as string | undefined);
  if (token) {
    const payload = verifyToken(token);
    if (payload) req.userId = payload.userId;
  }
  next();
}
