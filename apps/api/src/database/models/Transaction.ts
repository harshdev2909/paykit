import mongoose, { Schema, Document, Model } from "mongoose";

export type TransactionStatus = "pending" | "success" | "failed";

export interface ITransaction extends Document {
  _id: mongoose.Types.ObjectId;
  txHash: string;
  fromWallet: string;   // public key or wallet id
  toWallet: string;     // public key or wallet id
  assetCode: string;   // "XLM" | "USDC"
  assetIssuer?: string;
  amount: string;
  status: TransactionStatus;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    txHash: { type: String, required: true },
    fromWallet: { type: String, required: true },
    toWallet: { type: String, required: true },
    assetCode: { type: String, required: true },
    assetIssuer: { type: String },
    amount: { type: String, required: true },
    status: { type: String, enum: ["pending", "success", "failed"], default: "pending" },
  },
  { timestamps: true }
);

TransactionSchema.index({ txHash: 1 }, { unique: true });
TransactionSchema.index({ fromWallet: 1, createdAt: -1 });
TransactionSchema.index({ toWallet: 1, createdAt: -1 });
TransactionSchema.index({ status: 1 });

export const Transaction: Model<ITransaction> = mongoose.model<ITransaction>(
  "Transaction",
  TransactionSchema
);
