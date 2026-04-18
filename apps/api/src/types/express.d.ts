import type {} from "express";

declare global {
  namespace Express {
    interface Request {
      merchantId?: string;
      merchantName?: string;
    }
  }
}

export {};
