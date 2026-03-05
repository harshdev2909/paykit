import mongoose, { Schema, Document, Model } from "mongoose";

export type PlanSlug = "free" | "pro" | "premium" | "enterprise";

export interface IPlan extends Document {
  _id: mongoose.Types.ObjectId;
  slug: PlanSlug;
  name: string;
  price: number;
  txFee: number;
  rateLimitPerSec: number;
  apiRequestsPerMonth: number;
  features: string[];
  createdAt: Date;
  updatedAt: Date;
}

const PlanSchema = new Schema<IPlan>(
  {
    slug: { type: String, enum: ["free", "pro", "premium", "enterprise"], required: true, unique: true },
    name: { type: String, required: true },
    price: { type: Number, default: 0 },
    txFee: { type: Number, default: 0 },
    rateLimitPerSec: { type: Number, required: true },
    apiRequestsPerMonth: { type: Number, required: true },
    features: [{ type: String }],
  },
  { timestamps: true }
);

export const Plan: Model<IPlan> = mongoose.model<IPlan>("Plan", PlanSchema);
