import Redis from "ioredis";
import { redisConfig } from "./redis.config";
import logger from "./logger";

const LOG_CTX = { tenant: "system", userId: "system", userType: "ADMIN" };

/**
 * RedisManager — Singleton quản lý toàn bộ lifecycle của Redis connection.
 *
 * Tách biệt rõ ràng:
 *   - redis.config.ts  → config từ env
 *   - redis.manager.ts → quản lý kết nối (file này)
 *   - redis.ts         → CacheService (đọc/ghi data)
 */
export class RedisManager {
  private static instance: RedisManager;
  private client: Redis;
  private connected = false;
  private readonly prefix: string;

  private constructor() {
    this.prefix = redisConfig.prefix;

    this.client = new Redis({
      host: redisConfig.host,
      port: redisConfig.port,
      enableReadyCheck: false,
      maxRetriesPerRequest: redisConfig.maxRetriesPerRequest,
      retryStrategy: (times) => {
        const delay = Math.min(times * 200, 5000);
        logger.warn(`Redis reconnecting... attempt #${times}, delay ${delay}ms`, LOG_CTX);
        return delay;
      },
    });

    this.registerEvents();
  }

  /** Singleton — đảm bảo chỉ có 1 instance duy nhất */
  static getInstance(): RedisManager {
    if (!RedisManager.instance) {
      RedisManager.instance = new RedisManager();
    }
    return RedisManager.instance;
  }

  /** Kết nối — chờ ready hoặc timeout */
  async connect(): Promise<void> {
    return new Promise((resolve) => {
      if (this.connected) return resolve();

      this.client.once("ready", () => resolve());
      setTimeout(() => {
        if (!this.connected) {
          logger.warn("Redis connect timeout — server tiếp tục chạy không có cache", LOG_CTX);
        }
        resolve();
      }, redisConfig.connectTimeout);
    });
  }

  /** Đóng kết nối graceful */
  async disconnect(): Promise<void> {
    await this.client.quit();
    this.connected = false;
    logger.info("Redis disconnected gracefully", LOG_CTX);
  }

  /** Lấy ioredis client gốc (khi cần thao tác nâng cao) */
  getClient(): Redis {
    return this.client;
  }

  /** Trạng thái kết nối */
  isConnected(): boolean {
    return this.connected;
  }

  /** Lấy prefix hiện tại */
  getPrefix(): string {
    return this.prefix;
  }

  /** Gắn prefix vào key: saas:products:list → tránh xung đột */
  prefixKey(key: string): string {
    if (key.startsWith(`${this.prefix}:`)) return key;
    return `${this.prefix}:${key}`;
  }

  /** Đăng ký event listeners */
  private registerEvents(): void {
    this.client.on("ready", () => {
      this.connected = true;
      logger.info(`✅ Redis connected [${redisConfig.host}:${redisConfig.port}] prefix="${this.prefix}"`, LOG_CTX);
    });

    this.client.on("error", (err) => {
      logger.error(`❌ Redis error: ${err.message}`, LOG_CTX);
      this.connected = false;
    });

    this.client.on("close", () => {
      logger.warn("⚠️ Redis connection closed", LOG_CTX);
      this.connected = false;
    });

    this.client.on("reconnecting", () => {
      logger.info("🔄 Redis reconnecting...", LOG_CTX);
    });
  }
}
