import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPaymentLink extends Document {
  _id: mongoose.Types.ObjectId;
  merchantId: mongoose.Types.ObjectId;
  amount: string;
  asset: string;
  description?: string;
  slug: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentLinkSchema = new Schema<IPaymentLink>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: "Merchant", required: true },
    amount: { type: String, required: true },
    asset: { type: String, required: true },
    description: { type: String },
    slug: { type: String, required: true, unique: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);
// unique: true on slug already creates an index for slug
PaymentLinkSchema.index({ merchantId: 1 });

export const PaymentLink: Model<IPaymentLink> = mongoose.model<IPaymentLink>("PaymentLink", PaymentLinkSchema);
