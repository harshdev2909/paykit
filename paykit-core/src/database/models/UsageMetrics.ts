import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUsageMetrics extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  month: string;
  apiCalls: number;
  paymentsVolume: string;
  checkoutSessions: number;
  createdAt: Date;
  updatedAt: Date;
}

const UsageMetricsSchema = new Schema<IUsageMetrics>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    month: { type: String, required: true },
    apiCalls: { type: Number, default: 0 },
    paymentsVolume: { type: String, default: "0" },
    checkoutSessions: { type: Number, default: 0 },
  },
  { timestamps: true }
);

UsageMetricsSchema.index({ organizationId: 1, month: 1 }, { unique: true });

export const UsageMetrics: Model<IUsageMetrics> = mongoose.model<IUsageMetrics>(
  "UsageMetrics",
  UsageMetricsSchema
);
