import mongoose from "mongoose";
import { env } from "./env";
import logger from "./logger";

export const connectMongoDB = async (): Promise<void> => {
  if (!env.MONGO_URI) {
    logger.warn("⚠️ MONGODB_URI is not provided. MongoDB features (log/chat) are disabled.");
    return;
  }
  try {
    await mongoose.connect(env.MONGO_URI);
    logger.info("✅ MongoDB connected");
  } catch (error) {
    logger.error("❌ MongoDB connection failed:", error);
  }
};
