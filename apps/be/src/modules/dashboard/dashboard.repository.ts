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
        where: { order_status: "DELIVERED", deleted_at: null },
        _sum: { total: true },
      }),
      this.db.order.aggregate({
        where: {
          order_status: "DELIVERED",
          deleted_at: null,
          created_at: { gte: today, lt: tomorrow },
        },
        _sum: { total: true },
      }),
      this.db.product.count({ where: { deleted_at: null, is_active: true } }),
      this.db.productVariant.count({
        where: {
          stock: { lte: 5 },
          is_active: true,
          product: { deleted_at: null },
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
        order_status: "DELIVERED",
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
          order_status: "DELIVERED", 
          deleted_at: null,
          created_at: { gte: from, lte: to }
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
          order_status: "DELIVERED", 
          deleted_at: null,
          created_at: { gte: from, lte: to } 
        } 
      },
      select: { variant: { select: { product_id: true } } },
      distinct: ["variant_id"],
    });

    const soldIds = [
      ...new Set(soldProductIds.map((i) => i.variant.product_id)),
    ];

    return this.db.product.findMany({
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
  }

  // ── Raw data cho export ────────────────────────────
  async getRevenueRaw(filter: DashboardFilterDto) {
    return this.getRevenue(filter);
  }
}
