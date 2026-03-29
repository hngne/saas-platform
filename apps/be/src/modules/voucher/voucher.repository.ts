import { PrismaClient as RetailClient } from "../../../generated/retail-client";
import { buildPaginationMeta } from "@/shared/utils/pagination.util";
import {
  CreateVoucherDto,
  UpdateVoucherDto,
  VoucherFilterDto,
} from "./voucher.validator";

export class VoucherRepository {
  constructor(private db: RetailClient) {}

  async findAll(filter: VoucherFilterDto) {
    const {
      page,
      limit,
      search,
      discount_type,
      is_active,
      date_from,
      date_to,
    } = filter;

    const where: any = {
      ...(is_active !== undefined && { is_active }),
      ...(discount_type && { discount_type }),
      ...((date_from || date_to) && {
        start_date: {
          ...(date_from && { gte: date_from }),
          ...(date_to && { lte: date_to }),
        },
      }),
      ...(search && {
        OR: [
          { code: { contains: search.toUpperCase() } },
          { name: { contains: search } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.db.voucher.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.db.voucher.count({ where }),
    ]);

    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async findById(id: string) {
    return this.db.voucher.findUnique({ where: { id } });
  }

  async findByCode(code: string, excludeId?: string) {
    return this.db.voucher.findFirst({
      where: {
        code,
        ...(excludeId && { id: { not: excludeId } }),
      },
    });
  }

  async create(dto: CreateVoucherDto) {
    return this.db.voucher.create({ data: dto });
  }

  async update(id: string, dto: UpdateVoucherDto) {
    return this.db.voucher.update({ where: { id }, data: dto });
  }

  async delete(id: string) {
    return this.db.voucher.delete({ where: { id } });
  }

  async toggleActive(id: string, is_active: boolean) {
    return this.db.voucher.update({ where: { id }, data: { is_active } });
  }

  async isUsedInOrder(id: string) {
    const voucher = await this.db.voucher.findUnique({
      where: { id },
      select: { used_count: true },
    });
    return (voucher?.used_count ?? 0) > 0;
  }
}
