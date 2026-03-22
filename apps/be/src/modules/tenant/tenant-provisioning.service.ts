import { env } from "@/configs/env";
import logger from "@/configs/logger";
import { PrismaClient } from "@prisma/client";
import { exec } from "child_process";
import path from "path";
import { promisify } from "util";

const execAsync = promisify(exec);

export const provisionTenantDB = async (dbName: string): Promise<void> => {
  if (!/^[a-z0-9_]+$/.test(dbName)) {
    throw new Error(`Tên database không hợp lệ: ${dbName}`);
  }

  const masterClient = new PrismaClient({
    datasources: {
      db: {
        url: `mysql://${env.DB_USER}:${env.DB_PASS}@${env.DB_HOST}:${env.DB_PORT}/mysql`,
      },
    },
  });

  try {
    await masterClient.$executeRawUnsafe(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    logger.info(`Database ${dbName} đã được tạo`);
  } finally {
    await masterClient.$disconnect();
  }

  const schemaPath = path.resolve("prisma-retail/schema.prisma");
  const dbUrl = `mysql://${env.DB_USER}:${env.DB_PASS}@${env.DB_HOST}:${env.DB_PORT}/${dbName}`;

  try {
    const { stdout, stderr } = await execAsync(
      `npx prisma db push --schema=${schemaPath} --skip-generate --accept-data-loss`,
      {
        env: {
          ...process.env,
          RETAIL_DB_URL: dbUrl,
        },
      },
    );
    if (stdout) logger.info(stdout);
    if (stderr) logger.warn(stderr);
    logger.info(`Schema đã được push vào database ${dbName}`);
  } catch (error: any) {
    logger.error(`Lỗi khi push schema cho ${dbName}: ${error.message}`);
    throw error;
  }
};
