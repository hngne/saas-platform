import { PrismaClient as RetailClient } from "../../../generated/retail-client";
import { buildPaginationMeta } from "@/shared/utils/pagination.util";
import {
  CreateStoreDto,
  UpdateStoreDto,
  StoreFilterDto,
} from "./store.validator";

export class StoreRepository {
  constructor(private db: RetailClient) {}

  async findAll(filter: StoreFilterDto) {
    const { page, limit, search, province, is_active } = filter;

    const where: any = {
      ...(search && {
        OR: [
          { name: { contains: search } },
          { address: { contains: search } },
          { phone: { contains: search } },
        ],
      }),
      ...(province && { province }),
      ...(is_active !== undefined && { is_active }),
    };

    const [data, total] = await Promise.all([
      this.db.store.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.db.store.count({ where }),
    ]);

    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async findById(id: string) {
    return this.db.store.findUnique({ where: { id } });
  }

  async findByName(name: string, excludeId?: string) {
    return this.db.store.findFirst({
      where: {
        name,
        ...(excludeId && { id: { not: excludeId } }),
      },
    });
  }

  async create(dto: CreateStoreDto) {
    return this.db.store.create({ data: dto });
  }

  async update(id: string, dto: UpdateStoreDto) {
    return this.db.store.update({ where: { id }, data: dto });
  }

  async delete(id: string) {
    return this.db.store.delete({ where: { id } });
  }

  async isUsedInOrder(id: string) {
    const count = await this.db.order.count({
      where: { pickup_store_id: id },
    });
    return count > 0;
  }
}
