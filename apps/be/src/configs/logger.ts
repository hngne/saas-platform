import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

const { combine, timestamp, printf, colorize, errors } = winston.format;

/**
 * Format log rõ ràng:
 * [2026-04-19 10:05:23] [INFO]  [shopqa] [USER:abc123] POST /api/products — Tạo sản phẩm thành công
 * [2026-04-19 10:05:24] [ERROR] [unknown] [anonymous] GET /api/xxx — TypeError: Cannot read...
 *   at Object.<anonymous> (/src/modules/product/product.service.ts:42:15)
 */
const logFormat = printf(
  ({ level, message, timestamp, stack, tenant, userId, userType }) => {
    const tenantTag = tenant || "system";
    const userTag = userId ? `${userType || "?"}:${userId}` : "anonymous";
    // Tùy chỉnh `level` an toàn hơn (bỏ toUpperCase để không hỏng ANSI codes của colorize)
    const output = `[${timestamp || ""}] [${level}] [${tenantTag}] [${userTag}] ${message}`;
    if (stack) return `${output}\n  ${stack}`;
    return output;
  },
);

const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "warn" : "debug",
  format: combine(
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    errors({ stack: true }),
    logFormat,
  ),
  transports: [
    // Console — chỉ dev
    new winston.transports.Console({
      format: combine(colorize(), timestamp({ format: "HH:mm:ss" }), logFormat),
      silent: process.env.NODE_ENV === "production",
    }),

    // File error
    new DailyRotateFile({
      filename: "logs/error-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      level: "error",
      maxFiles: "30d",
      zippedArchive: true,
    }),

    // File tất cả
    new DailyRotateFile({
      filename: "logs/combined-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxFiles: "14d",
      zippedArchive: true,
    }),
  ],
});

export default logger;
