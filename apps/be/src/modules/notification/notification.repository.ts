import { PrismaClient as RetailClient } from "../../../generated/retail-client";

export class NotificationRepository {
  constructor(private db: RetailClient) {}

  async create(data: {
    user_id: string;
    user_type: string;
    title: string;
    body: string;
    type: string;
  }) {
    return this.db.notification.create({ data });
  }

  async findByUser(
    userId: string,
    userType: string,
    skip: number,
    take: number,
  ) {
    const where = { user_id: userId, user_type: userType };
    const [data, total, unread] = await Promise.all([
      this.db.notification.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip,
        take,
      }),
      this.db.notification.count({ where }),
      this.db.notification.count({ where: { ...where, is_read: false } }),
    ]);
    return { data, total, unread };
  }

  async markAsRead(id: string, userId: string, userType: string) {
    return this.db.notification.updateMany({
      where: { id, user_id: userId, user_type: userType },
      data: { is_read: true },
    });
  }

  async markAllAsRead(userId: string, userType: string) {
    return this.db.notification.updateMany({
      where: { user_id: userId, user_type: userType, is_read: false },
      data: { is_read: true },
    });
  }
}
