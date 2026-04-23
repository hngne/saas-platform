import { PrismaClient as RetailClient } from "../../../generated/retail-client";
import { buildPaginationMeta } from "@/shared/utils/pagination.util";
import { OrderFilterDto, OrderStatus } from "./order.validator";
import { randomUUID } from "crypto";

export class OrderRepository {
  constructor(private db: RetailClient) {}

  async findAll(filter: OrderFilterDto) {
    const {
      page,
      limit,
      order_status,
      payment_status,
      payment_method,
      date_from,
      date_to,
      search,
      sort_order,
    } = filter;

    const where: any = {
      deleted_at: null,
      ...(order_status && { order_status }),
      ...(payment_status && { payment_status }),
      ...(payment_method && { payment_method }),
      ...((date_from || date_to) && {
        created_at: {
          ...(date_from && { gte: date_from }),
          ...(date_to && { lte: date_to }),
        },
      }),
      ...(search && {
        OR: [
          { receiver_name: { contains: search } },
          { receiver_phone: { contains: search } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.db.order.findMany({
        where,
        include: {
          customer: {
            select: { id: true, name: true, email: true, phone: true },
          },
          items: {
            include: {
              variant: {
                include: {
                  product: { select: { id: true, name: true } },
                  variant_values: {
                    include: {
                      attribute_value: {
                        include: { attribute: true },
                      },
                    },
                  },
                },
              },
            },
          },
          voucher: {
            select: {
              id: true,
              code: true,
              discount_type: true,
              discount_value: true,
            },
          },
          shipping_method: { select: { id: true, name: true, type: true, fee: true } },
          pickup_store: { select: { id: true, name: true, address: true, phone: true } },
          payment: true,
        },
        orderBy: { created_at: sort_order },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.db.order.count({ where }),
    ]);

    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async findById(id: string) {
    return this.db.order.findFirst({
      where: { id, deleted_at: null },
      include: {
        customer: {
          select: { id: true, name: true, email: true, phone: true },
        },
        items: {
          include: {
            variant: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    images: { take: 1, orderBy: { sort_order: "asc" } },
                  },
                },
                variant_values: {
                  include: {
                    attribute_value: { include: { attribute: true } },
                  },
                },
              },
            },
          },
        },
        voucher: true,
        shipping_method: true,
        pickup_store: true,
        payment: true,
      },
    });
  }

  async updateStatus(
    id: string,
    order_status: OrderStatus,
    payment_status?: "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "EXPIRED",
  ) {
    return this.db.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { id },
        data: payment_status ? { order_status, payment_status } : { order_status },
      });

      if (payment_status) {
        const paidAt = payment_status === "PAID" ? new Date() : null;

        await tx.payment.upsert({
          where: { order_id: id },
          create: {
            id: randomUUID(),
            order_id: id,
            method: order.payment_method,
            status: payment_status,
            amount: order.total,
            paid_at: paidAt,
          },
          update: {
            status: payment_status,
            paid_at: paidAt,
          },
        });
      }

      return order;
    });
  }

  async restoreStock(orderId: string, userId: string) {
    const items = await this.db.orderItem.findMany({
      where: { order_id: orderId },
      include: { variant: true },
    });

    await this.db.$transaction(async (tx) => {
      for (const item of items) {
        const beforeStock = item.variant.stock;
        const afterStock = beforeStock + item.quantity;

        await tx.productVariant.update({
          where: { id: item.variant_id },
          data: { stock: afterStock },
        });

        await tx.inventoryLog.create({
          data: {
            variant_id: item.variant_id,
            user_id: userId,
            type: "RETURN",
            quantity: item.quantity,
            before_stock: beforeStock,
            after_stock: afterStock,
            reference_id: orderId,
            reference_type: "RETURN",
            note: `Hoàn kho do hủy đơn #${orderId}`,
          },
        });
      }
    });
  }

  async restoreVoucher(orderId: string) {
    const order = await this.db.order.findUnique({
      where: { id: orderId },
      select: { voucher_id: true },
    });

    if (!order?.voucher_id) return;

    await this.db.voucher.update({
      where: { id: order.voucher_id },
      data: { used_count: { decrement: 1 } },
    });
  }

  async countByStatus() {
    const [pending, processing, shipped, delivered, completed, cancelled] =
      await Promise.all([
        this.db.order.count({
          where: { order_status: "PENDING", deleted_at: null },
        }),
        this.db.order.count({
          where: { order_status: "PROCESSING", deleted_at: null },
        }),
        this.db.order.count({
          where: { order_status: "SHIPPED", deleted_at: null },
        }),
        this.db.order.count({
          where: { order_status: "DELIVERED", deleted_at: null },
        }),
        this.db.order.count({
          where: { order_status: "COMPLETED", deleted_at: null },
        }),
        this.db.order.count({
          where: { order_status: "CANCELLED", deleted_at: null },
        }),
      ]);
    return { pending, processing, shipped, delivered, completed, cancelled };
  }

  async getSummary() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const [
      pending,
      processing,
      shipped,
      delivered,
      completed,
      cancelled,
      totalOrders,
      newOrdersToday,
      todayRevenueAggregate,
    ] = await Promise.all([
      this.db.order.count({
        where: { order_status: "PENDING", deleted_at: null },
      }),
      this.db.order.count({
        where: { order_status: "PROCESSING", deleted_at: null },
      }),
      this.db.order.count({
        where: { order_status: "SHIPPED", deleted_at: null },
      }),
      this.db.order.count({
        where: { order_status: "DELIVERED", deleted_at: null },
      }),
      this.db.order.count({
        where: { order_status: "COMPLETED", deleted_at: null },
      }),
      this.db.order.count({
        where: { order_status: "CANCELLED", deleted_at: null },
      }),
      this.db.order.count({
        where: { deleted_at: null },
      }),
      this.db.order.count({
        where: {
          deleted_at: null,
          created_at: {
            gte: todayStart,
            lt: tomorrowStart,
          },
        },
      }),
      this.db.order.aggregate({
        where: {
          deleted_at: null,
          payment_status: "PAID",
          order_status: { not: "CANCELLED" },
          created_at: {
            gte: todayStart,
            lt: tomorrowStart,
          },
        },
        _sum: {
          total: true,
        },
      }),
    ]);

    return {
      total_orders: totalOrders,
      pending_orders: pending,
      processing_orders: processing,
      shipped_orders: shipped,
      delivered_orders: delivered,
      completed_orders: completed,
      cancelled_orders: cancelled,
      urgent_orders: pending + processing,
      new_orders_today: newOrdersToday,
      today_revenue: Number(todayRevenueAggregate._sum.total || 0),
      cancellation_rate:
        totalOrders > 0
          ? Number(((cancelled / totalOrders) * 100).toFixed(1))
          : 0,
    };
  }
}
