/**
 * Event streaming — publish events to Redis for WebSocket/SSE delivery.
 * Events: payment.created, payment.completed, wallet.created, swap.executed, yield.updated
 */

import { getRedisOptional } from "./redis";

const EVENTS_CHANNEL = "paykit:events";
const EVENTS_LIST_KEY = "paykit:events:list";
const EVENTS_LIST_MAX = 1000;

export type StreamEventType =
  | "payment.created"
  | "payment.completed"
  | "wallet.created"
  | "swap.executed"
  | "yield.updated"
  | "treasury.updated"
  | "checkout.completed";

export interface StreamEvent {
  id: string;
  type: StreamEventType;
  data: Record<string, unknown>;
  createdAt: string;
}

function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export async function publishToEventStream(type: StreamEventType, data: Record<string, unknown>): Promise<void> {
  const client = getRedisOptional();
  if (!client) return;
  try {
    const event: StreamEvent = {
      id: generateEventId(),
      type,
      data,
      createdAt: new Date().toISOString(),
    };
    const payload = JSON.stringify(event);
    await client.lpush(EVENTS_LIST_KEY, payload);
    await client.ltrim(EVENTS_LIST_KEY, 0, EVENTS_LIST_MAX - 1);
    await client.publish(EVENTS_CHANNEL, payload);
  } catch {
    /* ignore when Redis unavailable */
  }
}

export function getEventsChannel(): string {
  return EVENTS_CHANNEL;
}

export async function getRecentEvents(limit: number): Promise<StreamEvent[]> {
  const client = getRedisOptional();
  if (!client) return [];
  try {
    const raw = await client.lrange(EVENTS_LIST_KEY, 0, limit - 1);
    return raw.map((s) => {
      try {
        return JSON.parse(s) as StreamEvent;
      } catch {
        return null;
      }
    }).filter(Boolean) as StreamEvent[];
  } catch {
    return [];
  }
}
