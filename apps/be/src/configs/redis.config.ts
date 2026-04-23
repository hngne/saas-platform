import { env } from "./env";

/**
 * Redis connection config — lấy hoàn toàn từ env, không hard-code.
 */
export const redisConfig = {
  host: env.REDIS_HOST,
  port: Number(env.REDIS_PORT),
  prefix: env.REDIS_PREFIX || "saas",
  connectTimeout: 5000,
  maxRetriesPerRequest: 3,
};
