import prisma from "@/configs/database";

export class AdminRepository {
  async findById(id: string) {
    return prisma.admin.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        created_at: true,
      },
    });
  }

  async getStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, active, banned, newThisMonth] = await Promise.all([
      prisma.tenant.count(),
      prisma.tenant.count({ where: { status: "ACTIVE" } }),
      prisma.tenant.count({ where: { status: "BANNED" } }),
      prisma.tenant.count({
        where: { created_at: { gte: startOfMonth } },
      }),
    ]);

    // 6 tháng gần nhất
    const months = await Promise.all(
      Array.from({ length: 6 }, (_, i) => {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const nextDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        return prisma.tenant
          .count({
            where: {
              created_at: { gte: date, lt: nextDate },
            },
          })
          .then((count) => ({
            month: `${date.getMonth() + 1}/${date.getFullYear()}`,
            count,
          }));
      }),
    );

    return {
      total,
      active,
      banned,
      newThisMonth,
      chartData: months.reverse(),
    };
  }
}
