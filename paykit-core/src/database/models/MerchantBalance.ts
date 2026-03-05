import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMerchantBalance extends Document {
  _id: mongoose.Types.ObjectId;
  merchantId: mongoose.Types.ObjectId;
  asset: string;
  assetIssuer?: string;
  balance: string;
  updatedAt: Date;
}

const MerchantBalanceSchema = new Schema<IMerchantBalance>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: "Merchant", required: true },
    asset: { type: String, required: true },
    assetIssuer: { type: String },
    balance: { type: String, required: true, default: "0" },
  },
  { timestamps: true }
);

MerchantBalanceSchema.index({ merchantId: 1, asset: 1, assetIssuer: 1 }, { unique: true });

export const MerchantBalance: Model<IMerchantBalance> = mongoose.model<IMerchantBalance>(
  "MerchantBalance",
  MerchantBalanceSchema
);
