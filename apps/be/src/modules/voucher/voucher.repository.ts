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
      status,
      is_active,
      date_from,
      date_to,
      sort_order,
    } = filter;

    const now = new Date();

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

    if (status === "ACTIVE") {
      where.is_active = true;
      where.AND = [
        ...(where.AND || []),
        {
          OR: [{ start_date: null }, { start_date: { lte: now } }],
        },
        {
          OR: [{ end_date: null }, { end_date: { gte: now } }],
        },
      ];
    }

    if (status === "EXPIRED") {
      where.AND = [
        ...(where.AND || []),
        { end_date: { lt: now } },
      ];
    }

    if (status === "UPCOMING") {
      where.AND = [
        ...(where.AND || []),
        { is_active: true },
        { start_date: { gt: now } },
      ];
    }

    if (status === "INACTIVE") {
      where.AND = [
        ...(where.AND || []),
        { is_active: false },
        {
          OR: [{ end_date: null }, { end_date: { gte: now } }],
        },
      ];
    }

    const [data, total] = await Promise.all([
      this.db.voucher.findMany({
        where,
        orderBy: { created_at: sort_order },
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

  async getSummary() {
    const vouchers = await this.db.voucher.findMany({
      select: {
        id: true,
        discount_type: true,
        discount_value: true,
        max_discount: true,
        usage_limit: true,
        used_count: true,
        is_active: true,
        start_date: true,
        end_date: true,
      },
    });

    const now = new Date();
    const soon = new Date(now);
    soon.setDate(soon.getDate() + 2);

    const summary = vouchers.reduce(
      (acc, voucher) => {
        const discountValue = Number(voucher.discount_value || 0);
        const maxDiscount = Number(voucher.max_discount || 0);
        const nominalValue =
          voucher.discount_type === "FIXED"
            ? discountValue
            : maxDiscount || discountValue;

        const isExpired = !!voucher.end_date && voucher.end_date < now;
        const isUpcoming = !!voucher.start_date && voucher.start_date > now;
        const isRunning =
          voucher.is_active &&
          !isExpired &&
          (!voucher.start_date || voucher.start_date <= now);

        acc.total_vouchers += 1;
        acc.total_redemptions += voucher.used_count || 0;
        acc.discount_budget += (voucher.used_count || 0) * nominalValue;

        if (voucher.discount_type === "FIXED") acc.fixed_vouchers += 1;
        if (voucher.discount_type === "PERCENT") acc.percent_vouchers += 1;
        if (isRunning) acc.active_vouchers += 1;
        if (isExpired) acc.expired_vouchers += 1;
        if (isUpcoming) acc.upcoming_vouchers += 1;
        if (!voucher.is_active && !isExpired) acc.inactive_vouchers += 1;
        if (voucher.used_count > 0) acc.redeemed_vouchers += 1;

        if (
          voucher.end_date &&
          voucher.end_date >= now &&
          voucher.end_date <= soon
        ) {
          acc.expiring_soon += 1;
        }

        if (voucher.usage_limit && voucher.usage_limit > 0) {
          acc.capacity_total += voucher.usage_limit;
          acc.capacity_used += Math.min(voucher.used_count, voucher.usage_limit);
        }

        return acc;
      },
      {
        total_vouchers: 0,
        active_vouchers: 0,
        expired_vouchers: 0,
        upcoming_vouchers: 0,
        inactive_vouchers: 0,
        fixed_vouchers: 0,
        percent_vouchers: 0,
        redeemed_vouchers: 0,
        total_redemptions: 0,
        discount_budget: 0,
        expiring_soon: 0,
        capacity_total: 0,
        capacity_used: 0,
      },
    );

    const conversion_rate =
      summary.capacity_total > 0
        ? Number(
            ((summary.capacity_used / summary.capacity_total) * 100).toFixed(1),
          )
        : summary.total_vouchers > 0
          ? Number(
              (
                (summary.redeemed_vouchers / summary.total_vouchers) *
                100
              ).toFixed(1),
            )
          : 0;

    return {
      ...summary,
      discount_budget: Number(summary.discount_budget.toFixed(2)),
      conversion_rate,
    };
  }
}
