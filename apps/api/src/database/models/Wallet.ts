import mongoose, { Schema, Document, Model } from "mongoose";

export interface IWallet extends Document {
  _id: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  /** When set, wallet was provisioned for this merchant (e.g. agent API key). */
  merchantId?: mongoose.Types.ObjectId;
  kind?: "custodial" | "agent";
  /** Agent spending policy snapshot (caps, domains, Soroban policy contract id, etc.). */
  agentPolicy?: Record<string, unknown>;
  publicKey: string;
  encryptedPrivateKey: string;
  createdAt: Date;
  updatedAt: Date;
}

const WalletSchema = new Schema<IWallet>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    merchantId: { type: Schema.Types.ObjectId, ref: "Merchant", required: false },
    kind: { type: String, enum: ["custodial", "agent"], default: "custodial" },
    agentPolicy: { type: Schema.Types.Mixed, required: false },
    publicKey: { type: String, required: true, unique: true },
    encryptedPrivateKey: { type: String, required: true },
  },
  { timestamps: true }
);
// unique: true on publicKey already creates the index
WalletSchema.index({ merchantId: 1, createdAt: -1 });

export const Wallet: Model<IWallet> = mongoose.model<IWallet>("Wallet", WalletSchema);
