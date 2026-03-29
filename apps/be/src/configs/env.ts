import { z } from "zod";
import dotenv from "dotenv";

dotenv.config({ path: `.env.${process.env.NODE_ENV || "development"}` });

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.string().default("8080"),

  DB_PLATFORM_URL: z.string().min(1, "DB_PLATFORM_URL is required"),
  RETAIL_DB_URL: z.string().min(1, "RETAIL_DB_URL is required"),

  DB_HOST: z.string().default("localhost"),
  DB_PORT: z.string().default("3306"),
  DB_USER: z.string().default("root"),
  DB_PASS: z.string().default(""),

  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.string().default("6379"),
  REDIS_USERNAME: z.string().optional(),
  REDIS_PASSWORD: z.string().optional(),

  MONGO_URI: z.string().min(1, "MONGO_URI is required"),

  JWT_ACCESS_SECRET: z.string().min(1, "JWT_ACCESS_SECRET is required"),
  JWT_REFRESH_SECRET: z.string().min(1, "JWT_REFRESH_SECRET is required"),
  JWT_ACCESS_EXPIRES: z.string().default("1h"),
  JWT_REFRESH_EXPIRES: z.string().default("7d"),

  BCRYPT_ROUNDS: z.string().default("10"),

  CORS_ORIGINS: z.string().default("http://localhost:3000"),
  CLOUDINARY_NAME: z.string().min(1, "CLOUDINARY_NAME is required"),
  CLOUDINARY_API_KEY: z.string().min(1, "CLOUDINARY_API_KEY is required"),
  CLOUDINARY_API_SECRET: z.string().min(1, "CLOUDINARY_API_SECRET is required"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "Invalid environment variables:",
    parsed.error.flatten().fieldErrors,
  );
  process.exit(1);
}

export const env = parsed.data;
