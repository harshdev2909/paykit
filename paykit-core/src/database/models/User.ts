import mongoose, { Schema, Document, Model } from "mongoose";

export type PlanSlug = "free" | "pro" | "premium" | "enterprise";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email?: string;
  name?: string;
  externalId?: string;
  provider?: string;
  providerId?: string;
  plan: PlanSlug;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, sparse: true },
    name: { type: String },
    externalId: { type: String, sparse: true },
    provider: { type: String },
    providerId: { type: String },
    plan: { type: String, enum: ["free", "pro", "premium", "enterprise"], default: "free" },
  },
  { timestamps: true }
);

UserSchema.index({ provider: 1, providerId: 1 }, { unique: true, sparse: true });

export const User: Model<IUser> = mongoose.model<IUser>("User", UserSchema);
