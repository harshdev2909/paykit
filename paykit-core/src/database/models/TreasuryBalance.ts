import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITreasuryBalance extends Document {
  _id: mongoose.Types.ObjectId;
  treasuryAccountId: mongoose.Types.ObjectId;
  assetCode: string;
  assetIssuer?: string;
  amount: string;
  yieldEnabled: boolean;
  principalAmount?: string;
  yieldEarned?: string;
  apy?: string;
  lastUpdatedFromHorizon: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TreasuryBalanceSchema = new Schema<ITreasuryBalance>(
  {
    treasuryAccountId: { type: Schema.Types.ObjectId, ref: "TreasuryAccount", required: true },
    assetCode: { type: String, required: true },
    assetIssuer: { type: String },
    amount: { type: String, required: true, default: "0" },
    yieldEnabled: { type: Boolean, default: false },
    principalAmount: { type: String },
    yieldEarned: { type: String },
    apy: { type: String },
    lastUpdatedFromHorizon: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

TreasuryBalanceSchema.index(
  { treasuryAccountId: 1, assetCode: 1, assetIssuer: 1 },
  { unique: true }
);

export const TreasuryBalance: Model<ITreasuryBalance> = mongoose.model<ITreasuryBalance>(
  "TreasuryBalance",
  TreasuryBalanceSchema
);
