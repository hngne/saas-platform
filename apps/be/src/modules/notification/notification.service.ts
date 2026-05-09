import { PrismaClient as RetailClient } from "../../../generated/retail-client";
import { NotificationRepository } from "./notification.repository";
import { getIO } from "@/configs/socket";
import logger from "@/configs/logger";

interface CreateNotificationDto {
  userId: string;
  userType: "USER" | "CUSTOMER";
  title: string;
  body: string;
  type: "ORDER" | "INVENTORY" | "SYSTEM" | "PAYMENT";
}

export class NotificationService {
  private repo: NotificationRepository;

  constructor(private db: RetailClient) {
    this.repo = new NotificationRepository(db);
  }

  /**
   * Tạo notification trong DB + emit socket real-time.
   */
  async create(tenantId: string, dto: CreateNotificationDto) {
    const notification = await this.repo.create({
      user_id: dto.userId,
      user_type: dto.userType,
      title: dto.title,
      body: dto.body,
      type: dto.type,
    });

    // Emit socket real-time
    this.emitToUser(tenantId, dto.userId, dto.userType, {
      id: notification.id,
      title: dto.title,
      body: dto.body,
      type: dto.type,
      is_read: false,
      created_at: notification.created_at,
    });

    return notification;
  }

  /**
   * Gửi thông báo broadcast cho TẤT CẢ merchant của 1 shop.
   * Đồng thời lưu vào DB cho từng merchant để khi F5 vẫn còn dữ liệu.
   */
  async notifyMerchants(tenantId: string, title: string, body: string, type: "ORDER" | "INVENTORY" | "SYSTEM" | "PAYMENT") {
    try {
      const now = new Date();

      // 1. Tìm tất cả merchant (user) đang hoạt động trong DB của tenant
      const merchants = await this.db.user.findMany({
        where: {
          status: "ACTIVE",
          deleted_at: null,
        },
        select: { id: true },
      });

      // 2. Lưu thông báo vào DB cho từng merchant
      if (merchants.length > 0) {
        await this.db.notification.createMany({
          data: merchants.map((m) => ({
            user_id: m.id,
            user_type: "USER",
            title,
            body,
            type,
            created_at: now,
          })),
        });
      }

      // 3. Emit socket real-time cho các client đang online
      const io = getIO();
      io.to(`tenant:${tenantId}:merchants`).emit("notification:new", {
        title,
        body,
        type,
        is_read: false,
        created_at: now,
      });
    } catch (err) {
      logger.warn("[NotificationService] notifyMerchants failed", {
        tenant: tenantId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /** Lấy danh sách notification */
  async getByUser(userId: string, userType: string, page = 1, limit = 20) {
    return this.repo.findByUser(userId, userType, (page - 1) * limit, limit);
  }

  /** Đánh dấu đã đọc */
  async markAsRead(notificationId: string, userId: string, userType: string) {
    return this.repo.markAsRead(notificationId, userId, userType);
  }

  /** Đánh dấu tất cả đã đọc */
  async markAllAsRead(userId: string, userType: string) {
    return this.repo.markAllAsRead(userId, userType);
  }

  /** Helper: emit socket cho 1 user cụ thể */
  private emitToUser(tenantId: string, userId: string, userType: string, payload: any) {
    try {
      const io = getIO();
      const room =
        userType === "CUSTOMER"
          ? `tenant:${tenantId}:customer:${userId}`
          : `tenant:${tenantId}:user:${userId}`;
      io.to(room).emit("notification:new", payload);
    } catch (err) {
      logger.warn("[NotificationService] Emit socket failed", {
        tenant: tenantId, userId, userType,
      });
    }
  }
}
