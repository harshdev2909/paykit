import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILiquidityPosition extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId?: mongoose.Types.ObjectId;
  merchantId?: mongoose.Types.ObjectId;
  asset: string;
  amount: string;
  poolId: string;
  apr?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LiquidityPositionSchema = new Schema<ILiquidityPosition>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization" },
    merchantId: { type: Schema.Types.ObjectId, ref: "Merchant" },
    asset: { type: String, required: true },
    amount: { type: String, required: true },
    poolId: { type: String, required: true, default: "paykit_usdc" },
    apr: { type: String },
  },
  { timestamps: true }
);

LiquidityPositionSchema.index({ organizationId: 1 });
LiquidityPositionSchema.index({ merchantId: 1 });

export const LiquidityPosition: Model<ILiquidityPosition> = mongoose.model<ILiquidityPosition>(
  "LiquidityPosition",
  LiquidityPositionSchema
);
