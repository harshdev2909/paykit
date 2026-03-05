import mongoose, { Schema, Document, Model } from "mongoose";

export const WEBHOOK_EVENTS = [
  "payment.created",
  "payment.completed",
  "payment.failed",
  "wallet.created",
  "treasury.updated",
  "path_payment.completed",
  "checkout.completed",
  "checkout.failed",
  "swap.executed",
  "yield.updated",
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENTS)[number];

export interface IWebhookSubscription extends Document {
  _id: mongoose.Types.ObjectId;
  url: string;
  events: WebhookEventType[];
  secret?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const WebhookSubscriptionSchema = new Schema<IWebhookSubscription>(
  {
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
