import mongoose from "mongoose";
import { config } from "../config";

export async function connectDatabase(): Promise<void> {
  await mongoose.connect(config.mongo.uri);
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
