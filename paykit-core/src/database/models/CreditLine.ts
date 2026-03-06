import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICreditLine extends Document {
  _id: mongoose.Types.ObjectId;
  treasuryAccountId: mongoose.Types.ObjectId;
  limitAmount: string;
  borrowedAmount: string;
  repaidAmount: string;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

const CreditLineSchema = new Schema<ICreditLine>(
  {
    treasuryAccountId: { type: Schema.Types.ObjectId, ref: "TreasuryAccount", required: true },
    limitAmount: { type: String, required: true, default: "0" },
    borrowedAmount: { type: String, required: true, default: "0" },
    repaidAmount: { type: String, required: true, default: "0" },
    currency: { type: String, default: "USDC" },
  },
  { timestamps: true }
);

CreditLineSchema.index({ treasuryAccountId: 1 }, { unique: true });

export const CreditLine: Model<ICreditLine> = mongoose.model<ICreditLine>(
  "CreditLine",
  CreditLineSchema
);
