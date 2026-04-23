import { PrismaClient as RetailClient } from "../../../generated/retail-client";
import { buildPaginationMeta } from "@/shared/utils/pagination.util";
import { CustomerFilterDto } from "./customer.validator";

const customerSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  avatar_url: true,
  status: true,
  created_at: true,
  updated_at: true,
  _count: {
    select: {
      orders: true,
      reviews: true,
    },
  },
} as const;

export class CustomerRepository {
  constructor(private db: RetailClient) {}

  async findAll(filter: CustomerFilterDto) {
    const { page, limit, search, status, sort_by, sort_order } = filter;
    const keyword = search?.trim();
    const where: any = {
      deleted_at: null,
      ...(status && { status }),
      ...(keyword && {
        OR: [
          { name: { contains: keyword } },
          { email: { contains: keyword } },
          { phone: { contains: keyword } },
        ],
      }),
    };

    const [customers, total] = await Promise.all([
      this.db.customer.findMany({
        where,
        select: customerSelect,
        orderBy: { [sort_by]: sort_order },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.db.customer.count({ where }),
    ]);

    const customerIds = customers.map((customer) => customer.id);
    const orderStats = customerIds.length
      ? await this.db.order.groupBy({
          by: ["customer_id"],
          where: {
            deleted_at: null,
            customer_id: { in: customerIds },
          },
          _sum: { total: true },
          _count: { id: true },
        })
      : [];

    const statsMap = new Map(
      orderStats.map((item) => [
        item.customer_id,
        {
          order_count: item._count.id,
          total_spent: Number(item._sum.total ?? 0),
        },
      ]),
    );

    const data = customers.map((customer) => {
      const stats = statsMap.get(customer.id);
      return {
        ...customer,
        order_count: stats?.order_count ?? customer._count.orders,
        review_count: customer._count.reviews,
        total_spent: stats?.total_spent ?? 0,
        _count: undefined,
      };
    });

    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async getSummary() {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [total, active, banned, newThisMonth] = await Promise.all([
      this.db.customer.count({ where: { deleted_at: null } }),
      this.db.customer.count({ where: { deleted_at: null, status: "ACTIVE" } }),
      this.db.customer.count({ where: { deleted_at: null, status: "BANNED" } }),
      this.db.customer.count({
        where: { deleted_at: null, created_at: { gte: startOfMonth } },
      }),
    ]);

    return { total, active, banned, new_this_month: newThisMonth };
  }

  async findById(id: string) {
    return this.db.customer.findFirst({
      where: { id, deleted_at: null },
      select: {
        ...customerSelect,
        addresses: {
          orderBy: [{ is_default: "desc" }, { created_at: "desc" }],
        },
        orders: {
          where: { deleted_at: null },
          orderBy: { created_at: "desc" },
          take: 5,
          select: {
            id: true,
            total: true,
            order_status: true,
            payment_status: true,
            created_at: true,
          },
        },
      },
    });
  }

  async updateStatus(id: string, status: string) {
    return this.db.customer.update({
      where: { id },
      data: { status },
      select: customerSelect,
    });
  }

  async deleteRefreshTokens(customerId: string) {
    return this.db.refreshToken.deleteMany({
      where: { user_id: customerId, user_type: "CUSTOMER" },
    });
  }
}
