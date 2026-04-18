import mongoose, { Schema, Document, Model } from "mongoose";

export interface IEmbeddedUser extends Document {
  _id: mongoose.Types.ObjectId;
  email?: string;
  provider?: string;
  providerId?: string;
  walletId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const EmbeddedUserSchema = new Schema<IEmbeddedUser>(
  {
    email: { type: String },
    provider: { type: String },
    providerId: { type: String },
    walletId: { type: Schema.Types.ObjectId, ref: "Wallet", required: true },
  },
  { timestamps: true }
);

EmbeddedUserSchema.index({ email: 1 }, { sparse: true });
EmbeddedUserSchema.index({ provider: 1, providerId: 1 }, { sparse: true });
EmbeddedUserSchema.index({ walletId: 1 }, { unique: true });

export const EmbeddedUser: Model<IEmbeddedUser> = mongoose.model<IEmbeddedUser>(
  "EmbeddedUser",
  EmbeddedUserSchema
);
