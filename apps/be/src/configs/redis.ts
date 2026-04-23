/**
 * Redis Entry Point
 *
 * Cấu trúc tách rời:
 *   configs/redis.config.ts   → Connection options từ env
 *   configs/redis.manager.ts  → RedisManager (Singleton, lifecycle)
 *   configs/cache.service.ts  → CacheService (OOP, get/set/del)
 *   configs/redis.ts          → Re-export + connectRedis() (file này)
 */

export { redisConfig } from "./redis.config";
export { RedisManager } from "./redis.manager";
export { CacheService } from "./cache.service";

import { RedisManager } from "./redis.manager";

/** Khởi tạo + kết nối Redis — gọi 1 lần trong server.ts */
export const connectRedis = async (): Promise<void> => {
  const manager = RedisManager.getInstance();
  await manager.connect();
};
