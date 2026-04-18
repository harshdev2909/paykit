import mongoose, { Schema, Document, Model } from "mongoose";

export interface IApiKey extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  keyHash: string;
  keyPrefix: string;
  name?: string;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ApiKeySchema = new Schema<IApiKey>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    keyHash: { type: String, required: true },
    keyPrefix: { type: String, required: true },
    name: { type: String },
    lastUsedAt: { type: Date },
  },
  { timestamps: true }
);

ApiKeySchema.index({ keyHash: 1 }, { unique: true });
ApiKeySchema.index({ organizationId: 1 });

export const ApiKey: Model<IApiKey> = mongoose.model<IApiKey>("ApiKey", ApiKeySchema);
