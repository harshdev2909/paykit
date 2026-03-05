import mongoose, { Schema, Document, Model } from "mongoose";

export type RiskEventType = "max_amount_exceeded" | "suspicious_tx" | "rate_limit" | "invalid_asset" | "other";

export interface IRiskEvent extends Document {
  _id: mongoose.Types.ObjectId;
  merchantId?: mongoose.Types.ObjectId;
  type: RiskEventType;
  payload: Record<string, unknown>;
  createdAt: Date;
}

const RiskEventSchema = new Schema<IRiskEvent>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: "Merchant" },
    type: { type: String, enum: ["max_amount_exceeded", "suspicious_tx", "rate_limit", "invalid_asset", "other"], required: true },
    payload: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

RiskEventSchema.index({ merchantId: 1, createdAt: -1 });
RiskEventSchema.index({ type: 1 });

export const RiskEvent: Model<IRiskEvent> = mongoose.model<IRiskEvent>("RiskEvent", RiskEventSchema);
