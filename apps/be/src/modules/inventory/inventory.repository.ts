import { PrismaClient as RetailClient } from "../../../generated/retail-client";
import { buildPaginationMeta } from "@/shared/utils/pagination.util";
import { removeVietnameseTones } from "@/shared/utils/string.util";
import {
  AdjustInventoryDto,
  InventoryFilterDto,
  LogFilterDto,
} from "./inventory.validator";

const LOW_STOCK_THRESHOLD = 5;

export class InventoryRepository {
  constructor(private db: RetailClient) {}

  async findAll(filter: InventoryFilterDto) {
    const { page, limit, search, category_id, low_stock, sort_order } = filter;

    const where: any = {
      product: { deleted_at: null },
      ...(low_stock === true && { stock: { lte: LOW_STOCK_THRESHOLD } }),
      ...(category_id && { product: { category_id } }),
      ...(search && {
        product: {
          search_name: { contains: removeVietnameseTones(search) },
        },
      }),
    };

    const [data, total] = await Promise.all([
      this.db.productVariant.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              category: { select: { id: true, name: true } },
              images: { take: 1, orderBy: { sort_order: "asc" } },
            },
          },
          variant_values: {
            include: {
              attribute_value: {
                include: { attribute: true },
              },
            },
          },
        },
        orderBy: { stock: sort_order },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.db.productVariant.count({ where }),
    ]);

    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async findVariantById(id: string) {
    return this.db.productVariant.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            category: { select: { id: true, name: true } },
          },
        },
        variant_values: {
          include: {
            attribute_value: {
              include: { attribute: true },
            },
          },
        },
      },
    });
  }

  async findRecentLogs(variantId: string, limit = 10) {
    return this.db.inventoryLog.findMany({
      where: { variant_id: variantId },
      orderBy: { created_at: "desc" },
      take: limit,
    });
  }

  async findLogs(filter: LogFilterDto) {
    const { page, limit, variant_id, type, date_from, date_to } = filter;

    const where: any = {
      ...(variant_id && { variant_id }),
      ...(type && { type }),
      ...((date_from || date_to) && {
        created_at: {
          ...(date_from && { gte: date_from }),
          ...(date_to && { lte: date_to }),
        },
      }),
    };

    const [data, total] = await Promise.all([
      this.db.inventoryLog.findMany({
        where,
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
        orderBy: { created_at: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.db.inventoryLog.count({ where }),
    ]);

    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async adjustStock(dto: AdjustInventoryDto, userId: string) {
    const variant = await this.db.productVariant.findUnique({
      where: { id: dto.variant_id },
    });
    if (!variant) return null;

    const beforeStock = variant.stock;
    let afterStock: number;

    if (dto.type === "IN") {
      afterStock = beforeStock + dto.quantity;
    } else if (dto.type === "OUT") {
      afterStock = beforeStock - dto.quantity;
    } else {
      // ADJUST — set thẳng về số lượng mới
      afterStock = dto.quantity;
    }

    // Update stock + ghi log trong transaction
    const [updatedVariant, log] = await this.db.$transaction([
      this.db.productVariant.update({
        where: { id: dto.variant_id },
        data: { stock: afterStock },
      }),
      this.db.inventoryLog.create({
        data: {
          variant_id: dto.variant_id,
          user_id: userId,
          type: dto.type,
          quantity: dto.quantity,
          before_stock: beforeStock,
          after_stock: afterStock,
          reference_type: "MANUAL",
          note: dto.note,
        },
      }),
    ]);

    return { variant: updatedVariant, log };
  }

  // Dùng cho AI gợi ý sau này
  async findLowStockVariants() {
    return this.db.productVariant.findMany({
      where: {
        stock: { lte: LOW_STOCK_THRESHOLD },
        is_active: true,
        product: { deleted_at: null, is_active: true },
      },
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
      orderBy: { stock: "asc" },
    });
  }
}
