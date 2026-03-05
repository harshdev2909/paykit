import mongoose, { Schema, Document, Model } from "mongoose";

export type CheckoutStatus = "open" | "completed" | "expired" | "failed";

export interface ICheckoutSession extends Document {
  _id: mongoose.Types.ObjectId;
  merchantId: mongoose.Types.ObjectId;
  amount: string;
  asset: string;
  assetIssuer?: string;
  status: CheckoutStatus;
  walletId: mongoose.Types.ObjectId;
  walletAddress: string;
  successUrl?: string;
  cancelUrl?: string;
  description?: string;
  txHash?: string;
  completedAt?: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CheckoutSessionSchema = new Schema<ICheckoutSession>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: "Merchant", required: true },
    amount: { type: String, required: true },
    asset: { type: String, required: true },
    assetIssuer: { type: String },
    status: { type: String, enum: ["open", "completed", "expired", "failed"], default: "open" },
    walletId: { type: Schema.Types.ObjectId, ref: "Wallet", required: true },
    walletAddress: { type: String, required: true },
    successUrl: { type: String },
    cancelUrl: { type: String },
    description: { type: String },
    txHash: { type: String },
    completedAt: { type: Date },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

CheckoutSessionSchema.index({ walletAddress: 1 });
CheckoutSessionSchema.index({ merchantId: 1, createdAt: -1 });
CheckoutSessionSchema.index({ status: 1 });

export const CheckoutSession: Model<ICheckoutSession> = mongoose.model<ICheckoutSession>(
  "CheckoutSession",
  CheckoutSessionSchema
);
