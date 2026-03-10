import Redis from "ioredis";
import { env } from "./env";
import logger from "./logger";

export const REDIS_KEY_PREFIX = "saas";

export function getPrefixedKey(key: string): string {
  if (key.startsWith(`${REDIS_KEY_PREFIX}:`)) return key;
  return `${REDIS_KEY_PREFIX}:${key}`;
}

let redis: Redis;
let isConnected = false;

export const connectRedis = async (): Promise<void> => {
  redis = new Redis({
    host: env.REDIS_HOST,
    port: Number(env.REDIS_PORT),
    username: env.REDIS_USERNAME || undefined,
    password: env.REDIS_PASSWORD || undefined,
    enableReadyCheck: false,
    retryStrategy: (times) => Math.min(times * 100, 3000),
  });

  redis.on("ready", () => {
    logger.info("✅ Redis connected");
    isConnected = true;
  });

  redis.on("error", (err) => {
    logger.error("❌ Redis error:", err.message);
    isConnected = false;
  });

  redis.on("end", () => {
    logger.warn("⚠️ Redis disconnected");
    isConnected = false;
  });

  // Chờ connect hoặc timeout 5s
  await new Promise<void>((resolve) => {
    redis.once("ready", () => resolve());
    setTimeout(() => resolve(), 5000); // không block startup nếu Redis chậm
  });
};

// ─── Cache helpers ───────────────────────────────────────

export const getCache = async <T>(key: string): Promise<T | null> => {
  try {
    if (!isConnected) return null;
    const data = await redis.get(getPrefixedKey(key));
    return data ? JSON.parse(data) : null;
  } catch (err: any) {
    logger.error("Redis getCache error", { key, error: err.message });
    return null;
  }
};

export const setCache = async (
  key: string,
  data: any,
  ttl?: number,
): Promise<void> => {
  try {
    if (!isConnected) return;
    const value = JSON.stringify(data);
    ttl
      ? await redis.set(getPrefixedKey(key), value, "EX", ttl)
      : await redis.set(getPrefixedKey(key), value);
  } catch (err: any) {
    logger.error("Redis setCache error", { key, error: err.message });
  }
};

export const deleteCache = async (key: string | string[]): Promise<void> => {
  try {
    if (!isConnected) return;
    const keys = Array.isArray(key)
      ? key.map(getPrefixedKey)
      : [getPrefixedKey(key)];
    await redis.del(...keys);
  } catch (err: any) {
    logger.error("Redis deleteCache error", { key, error: err.message });
  }
};

export const deleteCachePattern = async (pattern: string): Promise<void> => {
  try {
    if (!isConnected) return;
    const keys = await redis.keys(getPrefixedKey(pattern));
    if (keys.length > 0) await redis.del(...keys);
  } catch (err: any) {
    logger.error("Redis deleteCachePattern error", {
      pattern,
      error: err.message,
    });
  }
};

export const getRedisClient = () => redis;
export const isRedisConnected = () => isConnected;
