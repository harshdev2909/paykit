import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBalance extends Document {
  _id: mongoose.Types.ObjectId;
  walletId: mongoose.Types.ObjectId;
  publicKey: string;
  assetCode: string;
  assetIssuer?: string;
  amount: string;
  lastUpdatedFromHorizon: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BalanceSchema = new Schema<IBalance>(
  {
    walletId: { type: Schema.Types.ObjectId, ref: "Wallet", required: true },
    publicKey: { type: String, required: true },
    assetCode: { type: String, required: true },
    assetIssuer: { type: String },
    amount: { type: String, required: true, default: "0" },
    lastUpdatedFromHorizon: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

BalanceSchema.index({ publicKey: 1, assetCode: 1, assetIssuer: 1 }, { unique: true });
BalanceSchema.index({ walletId: 1 });

export const Balance: Model<IBalance> = mongoose.model<IBalance>("Balance", BalanceSchema);
