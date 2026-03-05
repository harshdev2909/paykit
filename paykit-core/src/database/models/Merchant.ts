import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMerchant extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  apiKey: string;
  webhookUrl?: string;
  settlementWalletId?: mongoose.Types.ObjectId;
  maxPaymentAmount?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MerchantSchema = new Schema<IMerchant>(
  {
    name: { type: String, required: true },
    apiKey: { type: String, required: true, unique: true },
    webhookUrl: { type: String },
    settlementWalletId: { type: Schema.Types.ObjectId, ref: "Wallet" },
    maxPaymentAmount: { type: String },
  },
  { timestamps: true }
);

MerchantSchema.index({ apiKey: 1 });

export const Merchant: Model<IMerchant> = mongoose.model<IMerchant>("Merchant", MerchantSchema);
