import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { env } from "./env";
import logger from "./logger";
import { verifyAccessToken } from "@/shared/utils/jwt.util";

let io: Server;

/**
 * Room naming convention:
 * - Merchant:  `tenant:{tenantId}:user:{userId}`   — nhân viên/chủ shop
 * - Customer:  `tenant:{tenantId}:customer:{customerId}` — khách hàng
 * - Merchant broadcast: `tenant:{tenantId}:merchants` — tất cả merchant của 1 shop
 */

export function initSocket(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const isLocalhost = /^https?:\/\/([^.]+\.)?localhost(:\d+)?$/.test(origin);
        const allowed = env.CORS_ORIGINS.split(",").map((o) => o.trim());
        if (allowed.includes(origin) || isLocalhost) {
          callback(null, true);
        } else {
          callback(new Error("CORS blocked"));
        }
      },
      credentials: true,
    },
  });

  io.on("connection", (socket: Socket) => {
    const token = socket.handshake.auth?.token as string;

    if (!token) {
      logger.warn("Socket kết nối không có token — disconnect", {
        tenant: "system", userId: "anonymous", userType: "?",
      });
      socket.disconnect(true);
      return;
    }

    try {
      const payload = verifyAccessToken(token);

      // Gắn user info vào socket data
      socket.data.user = payload;

      // Join rooms
      const tenantId = payload.tenantId;
      const userId = payload.sub;
      const userType = payload.userType;

      if (userType === "CUSTOMER") {
        socket.join(`tenant:${tenantId}:customer:${userId}`);
      } else if (userType === "USER") {
        socket.join(`tenant:${tenantId}:user:${userId}`);
        socket.join(`tenant:${tenantId}:merchants`); // broadcast room
      } else if (userType === "ADMIN") {
        socket.join("admin:all");
      }

      logger.info(`Socket connected: ${userType}:${userId}`, {
        tenant: tenantId, userId, userType,
      });

      // ── Client đánh dấu đã đọc thông báo ──
      socket.on("notification:read", (data: { notificationId: string }) => {
        // FE gửi event này khi user click vào notification
        // BE có thể xử lý ở đây nếu muốn, hoặc FE gọi REST API
        logger.debug(`Notification read: ${data.notificationId}`, {
          tenant: tenantId, userId, userType,
        });
      });

      socket.on("disconnect", () => {
        logger.info(`Socket disconnected: ${userType}:${userId}`, {
          tenant: tenantId, userId, userType,
        });
      });
    } catch (err) {
      logger.warn("Socket token không hợp lệ — disconnect", {
        tenant: "system", userId: "anonymous", userType: "?",
      });
      socket.disconnect(true);
    }
  });

  logger.info("✅ Socket.IO initialized", { tenant: "system", userId: "system", userType: "ADMIN" });

  return io;
}

export function getIO(): Server {
  if (!io) throw new Error("Socket.IO chưa được khởi tạo");
  return io;
}
