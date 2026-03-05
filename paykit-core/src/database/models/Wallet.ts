import mongoose, { Schema, Document, Model } from "mongoose";

export interface IWallet extends Document {
  _id: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  publicKey: string;
  encryptedPrivateKey: string;
  createdAt: Date;
  updatedAt: Date;
}

const WalletSchema = new Schema<IWallet>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    publicKey: { type: String, required: true, unique: true },
    encryptedPrivateKey: { type: String, required: true },
  },
  { timestamps: true }
);
// unique: true on publicKey already creates the index

export const Wallet: Model<IWallet> = mongoose.model<IWallet>("Wallet", WalletSchema);
