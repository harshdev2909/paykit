import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITreasuryAccount extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  walletId: mongoose.Types.ObjectId;
  publicKey: string;
  userId?: mongoose.Types.ObjectId;
  isMultisig: boolean;
  /** Smart treasury strategy: conservative | balanced | yield_max */
  strategy?: string;
  signerWeights?: Array<{ signer: string; weight: number }>;
  thresholds?: { low: number; medium: number; high: number };
  createdAt: Date;
  updatedAt: Date;
}

const TreasuryAccountSchema = new Schema<ITreasuryAccount>(
  {
    name: { type: String, required: true },
    walletId: { type: Schema.Types.ObjectId, ref: "Wallet", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    publicKey: { type: String, required: true, unique: true },
    strategy: { type: String, enum: ["conservative", "balanced", "yield_max"], default: undefined },
    isMultisig: { type: Boolean, default: false },
    signerWeights: [{ signer: { type: String }, weight: { type: Number } }],
    thresholds: {
      low: { type: Number },
      medium: { type: Number },
      high: { type: Number },
    },
  },
  { timestamps: true }
);

TreasuryAccountSchema.index({ publicKey: 1 });
TreasuryAccountSchema.index({ walletId: 1 });
TreasuryAccountSchema.index({ userId: 1 });

export const TreasuryAccount: Model<ITreasuryAccount> = mongoose.model<ITreasuryAccount>(
  "TreasuryAccount",
  TreasuryAccountSchema
);
