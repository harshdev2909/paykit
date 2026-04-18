import { EventEmitter } from "events";

/** In-process SSE fan-out for Phase 3 (pair with Redis for multi-instance later). */
export const phase3EventHub = new EventEmitter();
phase3EventHub.setMaxListeners(500);

export function broadcastMerchantEvent(merchantId: string, payload: unknown): void {
  phase3EventHub.emit(`m:${merchantId}`, payload);
}
