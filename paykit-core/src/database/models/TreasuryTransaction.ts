import mongoose, { Schema, Document, Model } from "mongoose";

export type TreasuryTransactionType = "allocation" | "payment" | "path_payment" | "payout" | "yield_deposit" | "yield_withdraw";

export interface ITreasuryTransaction extends Document {
  _id: mongoose.Types.ObjectId;
  treasuryAccountId: mongoose.Types.ObjectId;
  txHash: string;
  type: TreasuryTransactionType;
  assetCode: string;
  amount: string;
  counterparty?: string;
  status: "pending" | "success" | "failed";
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const TreasuryTransactionSchema = new Schema<ITreasuryTransaction>(
  {
    treasuryAccountId: { type: Schema.Types.ObjectId, ref: "TreasuryAccount", required: true },
    txHash: { type: String, required: true },
    type: {
      type: String,
      enum: ["allocation", "payment", "path_payment", "payout", "yield_deposit", "yield_withdraw"],
      required: true,
    },
    assetCode: { type: String, required: true },
    amount: { type: String, required: true },
    counterparty: { type: String },
    status: { type: String, enum: ["pending", "success", "failed"], default: "pending" },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

TreasuryTransactionSchema.index({ treasuryAccountId: 1, createdAt: -1 });
TreasuryTransactionSchema.index({ txHash: 1 });

export const TreasuryTransaction: Model<ITreasuryTransaction> = mongoose.model<ITreasuryTransaction>(
  "TreasuryTransaction",
  TreasuryTransactionSchema
);
