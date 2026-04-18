import mongoose, { Schema, Document, Model } from "mongoose";

export type PlanSlug = "free" | "pro" | "premium" | "enterprise";

export interface IOrganization extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  ownerId: mongoose.Types.ObjectId;
  plan: PlanSlug;
  defaultMerchantId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    plan: { type: String, enum: ["free", "pro", "premium", "enterprise"], default: "free" },
    defaultMerchantId: { type: Schema.Types.ObjectId, ref: "Merchant" },
  },
  { timestamps: true }
);

OrganizationSchema.index({ ownerId: 1 });

export const Organization: Model<IOrganization> = mongoose.model<IOrganization>(
  "Organization",
  OrganizationSchema
);
