import prisma from "@/configs/database";
import { TenantListQuery } from "./tenant.types";
import { removeVietnameseTones } from "@/shared/utils/string.util";

export class TenantRepository {
  async findAll(query: TenantListQuery) {
    const { page = 1, limit = 10, status, keyword } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status) where.status = status;

    if (keyword) {
      const kw = removeVietnameseTones(keyword);
      where.OR = [
        { id: { contains: keyword } },
        { slug: { contains: kw } },
        { profile: { store_name: { contains: kw } } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { created_at: "desc" },
        include: { profile: true },
      }),
      prisma.tenant.count({ where }),
    ]);

    return { data, total, page: Number(page), limit: Number(limit) };
  }

  async findById(id: string) {
    return prisma.tenant.findUnique({
      where: { id },
      include: { profile: true },
    });
  }

  async updateStatus(id: string, status: string) {
    return prisma.tenant.update({
      where: { id },
      data: { status },
    });
  }
}
