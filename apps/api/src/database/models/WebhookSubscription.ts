import mongoose, { Schema, Document, Model } from "mongoose";

export const WEBHOOK_EVENTS = [
  "payment.completed",
  "payment.created",
  "payment.failed",
  "wallet.created",
  "checkout.completed",
  "checkout.failed",
  "receipt.settled",
  "x402.verified",
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENTS)[number];

export interface IWebhookSubscription extends Document {
  _id: mongoose.Types.ObjectId;
  /** When set, subscription is scoped to this merchant (v1 API key registrations). */
  merchantId?: mongoose.Types.ObjectId;
  url: string;
  events: WebhookEventType[];
  secret?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const WebhookSubscriptionSchema = new Schema<IWebhookSubscription>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: "Merchant", required: false },
    url: { type: String, required: true },
    events: [{ type: String, enum: WEBHOOK_EVENTS, required: true }],
    secret: { type: String },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

WebhookSubscriptionSchema.index({ url: 1, active: 1 });

export const WebhookSubscription: Model<IWebhookSubscription> = mongoose.model<IWebhookSubscription>(
  "WebhookSubscription",
  WebhookSubscriptionSchema
);
