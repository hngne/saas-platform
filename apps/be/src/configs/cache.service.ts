import { RedisManager } from "./redis.manager";
import logger from "./logger";

const LOG_CTX = { tenant: "system", userId: "system", userType: "ADMIN" };

/**
 * CacheService — Facade OOP để thao tác cache trên Redis.
 * Mọi key tự động được gắn prefix.
 * Mọi lỗi đều được catch + log — KHÔNG BAO GIỜ crash flow chính.
 */
export class CacheService {
  private manager: RedisManager;

  constructor() {
    this.manager = RedisManager.getInstance();
  }

  /** GET — Lấy data từ cache, trả null nếu không có hoặc Redis chết */
  async get<T>(key: string): Promise<T | null> {
    try {
      if (!this.manager.isConnected()) return null;
      const prefixed = this.manager.prefixKey(key);
      const data = await this.manager.getClient().get(prefixed);
      if (!data) return null;
      logger.debug(`Cache HIT: ${prefixed}`, LOG_CTX);
      return JSON.parse(data) as T;
    } catch (err: any) {
      logger.error(`Cache GET error [${key}]: ${err.message}`, LOG_CTX);
      return null;
    }
  }

  /** SET — Lưu data vào cache, có TTL (giây) */
  async set(key: string, data: any, ttlSeconds?: number): Promise<void> {
    try {
      if (!this.manager.isConnected()) return;
      const prefixed = this.manager.prefixKey(key);
      const value = JSON.stringify(data);
      if (ttlSeconds) {
        await this.manager.getClient().set(prefixed, value, "EX", ttlSeconds);
      } else {
        await this.manager.getClient().set(prefixed, value);
      }
      logger.debug(`Cache SET: ${prefixed}${ttlSeconds ? ` TTL=${ttlSeconds}s` : ""}`, LOG_CTX);
    } catch (err: any) {
      logger.error(`Cache SET error [${key}]: ${err.message}`, LOG_CTX);
    }
  }

  /** DEL — Xóa 1 hoặc nhiều key */
  async del(key: string | string[]): Promise<void> {
    try {
      if (!this.manager.isConnected()) return;
      const keys = Array.isArray(key)
        ? key.map((k) => this.manager.prefixKey(k))
        : [this.manager.prefixKey(key)];
      await this.manager.getClient().del(...keys);
      logger.debug(`Cache DEL: ${keys.join(", ")}`, LOG_CTX);
    } catch (err: any) {
      logger.error(`Cache DEL error [${key}]: ${err.message}`, LOG_CTX);
    }
  }

  /** DEL PATTERN — Xóa tất cả key khớp pattern (VD: "products:*") */
  async delPattern(pattern: string): Promise<void> {
    try {
      if (!this.manager.isConnected()) return;
      const prefixed = this.manager.prefixKey(pattern);
      const keys = await this.manager.getClient().keys(prefixed);
      if (keys.length > 0) {
        await this.manager.getClient().del(...keys);
        logger.debug(`Cache DEL_PATTERN: ${prefixed} (${keys.length} keys)`, LOG_CTX);
      }
    } catch (err: any) {
      logger.error(`Cache DEL_PATTERN error [${pattern}]: ${err.message}`, LOG_CTX);
    }
  }

  /** EXISTS — Kiểm tra key có tồn tại không */
  async exists(key: string): Promise<boolean> {
    try {
      if (!this.manager.isConnected()) return false;
      const result = await this.manager.getClient().exists(this.manager.prefixKey(key));
      return result === 1;
    } catch (err: any) {
      logger.error(`Cache EXISTS error [${key}]: ${err.message}`, LOG_CTX);
      return false;
    }
  }

  /** TTL — Lấy thời gian sống còn lại của key (giây) */
  async ttl(key: string): Promise<number> {
    try {
      if (!this.manager.isConnected()) return -1;
      return await this.manager.getClient().ttl(this.manager.prefixKey(key));
    } catch (err: any) {
      logger.error(`Cache TTL error [${key}]: ${err.message}`, LOG_CTX);
      return -1;
    }
  }

  /** INCR — Tăng giá trị number lên 1 (atomic, dùng cho rate limit/counter) */
  async incr(key: string, ttlSeconds?: number): Promise<number> {
    try {
      if (!this.manager.isConnected()) return 0;
      const prefixed = this.manager.prefixKey(key);
      const val = await this.manager.getClient().incr(prefixed);
      if (ttlSeconds && val === 1) {
        await this.manager.getClient().expire(prefixed, ttlSeconds);
      }
      return val;
    } catch (err: any) {
      logger.error(`Cache INCR error [${key}]: ${err.message}`, LOG_CTX);
      return 0;
    }
  }
}
