import { PrismaClient as RetailClient } from "../../../generated/retail-client";
import { DashboardFilterDto, TopFilterDto } from "./dashboard.validator";

export class DashboardRepository {
  constructor(private db: RetailClient) {}

  // ── Summary Cards ──────────────────────────────────
  async getSummary() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      totalOrders,
      todayOrders,
      pendingOrders,
      totalRevenue,
      todayRevenue,
      totalProducts,
      lowStockCount,
      totalCustomers,
    ] = await Promise.all([
      this.db.order.count({ where: { deleted_at: null } }),
      this.db.order.count({
        where: {
          deleted_at: null,
          created_at: { gte: today, lt: tomorrow },
        },
      }),
      this.db.order.count({
        where: { order_status: "PENDING", deleted_at: null },
      }),
      this.db.order.aggregate({
        where: {
          payment_status: "PAID",
          order_status: { not: "CANCELLED" },
          deleted_at: null,
        },
        _sum: { total: true },
      }),
      this.db.order.aggregate({
        where: {
          payment_status: "PAID",
          order_status: { not: "CANCELLED" },
          deleted_at: null,
          created_at: { gte: today, lt: tomorrow },
        },
        _sum: { total: true },
      }),
      this.db.product.count({ where: { deleted_at: null, is_active: true } }),
      this.db.product.count({
        where: {
          is_active: true,
          deleted_at: null,
          variants: {
            some: {
              stock: { lte: 5 },
              is_active: true,
            },
          },
        },
      }),
      this.db.customer.count({ where: { deleted_at: null } }),
    ]);

    return {
      orders: {
        total: totalOrders,
        today: todayOrders,
        pending: pendingOrders,
      },
      revenue: {
        total: totalRevenue._sum.total ?? 0,
        today: todayRevenue._sum.total ?? 0,
      },
      products: {
        total: totalProducts,
        low_stock: lowStockCount,
      },
      customers: {
        total: totalCustomers,
      },
    };
  }

  // ── Doanh thu theo day/month/year ──────────────────
  async getRevenue(filter: DashboardFilterDto) {
    const from =
      filter.from ?? new Date(new Date().setMonth(new Date().getMonth() - 1));
    const to = filter.to ?? new Date();

    const orders = await this.db.order.findMany({
      where: {
        payment_status: "PAID",
        order_status: { not: "CANCELLED" },
        deleted_at: null,
        created_at: { gte: from, lte: to },
      },
      select: { total: true, created_at: true },
    });

    // Group phía JS theo type
    const grouped = new Map<string, { revenue: number; count: number }>();

    for (const order of orders) {
      const date = new Date(order.created_at);
      let key: string;

      if (filter.type === "year") {
        key = date.getFullYear().toString();
      } else if (filter.type === "month") {
        key = `${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
      } else {
        key = date.toLocaleDateString("vi-VN");
      }

      const current = grouped.get(key) ?? { revenue: 0, count: 0 };
      grouped.set(key, {
        revenue: current.revenue + Number(order.total),
        count: current.count + 1,
      });
    }

    return Array.from(grouped.entries())
      .map(([time, data]) => ({
        time,
        revenue: data.revenue,
        order_count: data.count,
      }))
      .sort((a, b) => a.time.localeCompare(b.time));
  }

  // ── Top sản phẩm bán chạy ──────────────────────────
  async getTopSelling(filter: TopFilterDto) {
    const from =
      filter.from ?? new Date(new Date().setMonth(new Date().getMonth() - 1));
    const to = filter.to ?? new Date();

    const orderItems = await this.db.orderItem.findMany({
      where: {
        order: {
          payment_status: "PAID",
          order_status: { not: "CANCELLED" },
          deleted_at: null,
          created_at: { gte: from, lte: to },
        },
      },
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
          },
        },
      },
    });

    // Group theo product
    const grouped = new Map<
      string,
      {
        product_id: string;
        product_name: string;
        image_url: string | null;
        total_sold: number;
        total_revenue: number;
      }
    >();

    for (const item of orderItems) {
      const product = item.variant.product;
      const current = grouped.get(product.id) ?? {
        product_id: product.id,
        product_name: product.name,
        image_url: product.images[0]?.url ?? null,
        total_sold: 0,
        total_revenue: 0,
      };
      grouped.set(product.id, {
        ...current,
        total_sold: current.total_sold + item.quantity,
        total_revenue:
          current.total_revenue + Number(item.unit_price) * item.quantity,
      });
    }

    return Array.from(grouped.values())
      .sort((a, b) => b.total_sold - a.total_sold)
      .slice(0, filter.top);
  }

  // ── Top sản phẩm không bán được ───────────────────
  async getTopNotSelling(filter: TopFilterDto) {
    const from =
      filter.from ?? new Date(new Date().setMonth(new Date().getMonth() - 1));
    const to = filter.to ?? new Date();

    const soldProductIds = await this.db.orderItem.findMany({
      where: {
        order: {
          payment_status: "PAID",
          order_status: { not: "CANCELLED" },
          deleted_at: null,
          created_at: { gte: from, lte: to },
        },
      },
      select: { variant: { select: { product_id: true } } },
      distinct: ["variant_id"],
    });

    const soldIds = [
      ...new Set(soldProductIds.map((i) => i.variant.product_id)),
    ];

    const products = await this.db.product.findMany({
      where: {
        deleted_at: null,
        is_active: true,
        id: { notIn: soldIds.length > 0 ? soldIds : ["__none__"] },
      },
      select: {
        id: true,
        name: true,
        base_price: true,
        images: { take: 1, orderBy: { sort_order: "asc" } },
        variants: {
          select: { stock: true },
        },
      },
      take: filter.top,
    });

    return products.map((product) => ({
      id: product.id,
      name: product.name,
      product_id: product.id,
      product_name: product.name,
      image_url: product.images[0]?.url ?? null,
      total_sold: 0,
      total_revenue: 0,
      totalStock: product.variants.reduce((sum, variant) => sum + variant.stock, 0),
      stock: product.variants.reduce((sum, variant) => sum + variant.stock, 0),
      base_price: product.base_price,
    }));
  }

  // ── Phân bố trạng thái đơn hàng (Donut chart) ──────
  async getOrderStatusDistribution() {
    const statuses = [
      "PENDING",
      "PROCESSING",
      "SHIPPED",
      "DELIVERED",
      "COMPLETED",
      "CANCELLED",
    ] as const;

    const counts = await Promise.all(
      statuses.map((status) =>
        this.db.order.count({
          where: { order_status: status, deleted_at: null },
        }),
      ),
    );

    const total = counts.reduce((s, c) => s + c, 0);

    return {
      total,
      breakdown: statuses.map((status, i) => ({
        status,
        count: counts[i],
        percentage: total > 0 ? Math.round((counts[i] / total) * 100) : 0,
      })),
    };
  }

  // ── Đơn hàng gần đây (Recent Transactions) ─────────
  async getRecentOrders(limit = 5) {
    return this.db.order.findMany({
      where: { deleted_at: null },
      orderBy: { created_at: "desc" },
      take: limit,
      select: {
        id: true,
        receiver_name: true,
        total: true,
        order_status: true,
        created_at: true,
        customer: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  // ── Raw data cho export ────────────────────────────
  async getRevenueRaw(filter: DashboardFilterDto) {
    return this.getRevenue(filter);
  }
}
