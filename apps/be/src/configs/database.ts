import { PrismaClient } from "@prisma/client";
import logger from "./logger";

const prisma = new PrismaClient({
  log: [
    { emit: "event", level: "error" },
    { emit: "event", level: "warn" },
  ],
});

prisma.$on("error", (e: any) => {
  logger.error("❌ Prisma error:", e.message);
});

prisma.$on("warn", (e: any) => {
  logger.warn("⚠️ Prisma warning:", e.message);
});

export const connectDatabase = async (): Promise<void> => {
  try {
    await prisma.$connect();
    logger.info("✅ MySQL (Platform DB) connected");
  } catch (error) {
    logger.error("❌ MySQL connection failed:", error);
    process.exit(1);
  }
};

export default prisma;
