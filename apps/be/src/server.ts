import app from "./app";
import { env } from "./configs/env";
import logger from "./configs/logger";
import { connectDatabase } from "./configs/database";
import { connectRedis } from "./configs/redis";
import { connectMongoDB } from "./configs/mongodb";

const bootstrap = async () => {
  try {
    // Connect tất cả DB
    await connectDatabase();
    await connectRedis();
    await connectMongoDB();

    // Khởi động server
    app.listen(env.PORT, () => {
      logger.info(`🚀 Server running on port ${env.PORT}`);
      logger.info(`📌 Environment: ${env.NODE_ENV}`);
    });
  } catch (error) {
    logger.error("❌ Server startup failed:", error);
    process.exit(1);
  }
};

bootstrap();
