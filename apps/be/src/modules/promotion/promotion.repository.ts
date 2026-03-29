import { PrismaClient as RetailClient } from "../../../generated/retail-client";
import { buildPaginationMeta } from "@/shared/utils/pagination.util";
import {
  AddProductDto,
  CreatePromotionDto,
  PromotionFilterDto,
  UpdateProductDto,
  UpdatePromotionDto,
} from "./promotion.validator";

export class PromotionRepository {
  constructor(private db: RetailClient) {}

  async findAll(filter: PromotionFilterDto) {
    const { page, limit, search, is_active, date_from, date_to } = filter;

    const where: any = {
      ...(is_active !== undefined && { is_active }),
      ...((date_from || date_to) && {
        start_date: {
          ...(date_from && { gte: date_from }),
          ...(date_to && { lte: date_to }),
        },
      }),
      ...(search && { name: { contains: search } }),
    };

    const [data, total] = await Promise.all([
      this.db.promotion.findMany({
        where,
        include: {
          details: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  base_price: true,
                  images: { take: 1, orderBy: { sort_order: "asc" } },
                },
              },
            },
          },
        },
        orderBy: { created_at: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.db.promotion.count({ where }),
    ]);

    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async findById(id: string) {
    return this.db.promotion.findUnique({
      where: { id },
      include: {
        details: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                base_price: true,
                images: { take: 1, orderBy: { sort_order: "asc" } },
              },
            },
          },
        },
      },
    });
  }

  async findByName(name: string, excludeId?: string) {
    return this.db.promotion.findFirst({
      where: {
        name,
        ...(excludeId && { id: { not: excludeId } }),
      },
    });
  }

  async create(dto: CreatePromotionDto) {
    return this.db.promotion.create({
      data: {
        name: dto.name,
        description: dto.description,
        start_date: dto.start_date,
        end_date: dto.end_date,
        is_active: dto.is_active,
        details: {
          create: dto.details.map((d) => ({
            product_id: d.product_id,
            discount_percent: d.discount_percent,
          })),
        },
      },
      include: {
        details: {
          include: {
            product: { select: { id: true, name: true, base_price: true } },
          },
        },
      },
    });
  }

  async update(id: string, dto: UpdatePromotionDto) {
    return this.db.promotion.update({
      where: { id },
      data: dto,
      include: { details: true },
    });
  }

  async delete(id: string) {
    return this.db.promotion.delete({ where: { id } });
  }

  async toggleActive(id: string, is_active: boolean) {
    return this.db.promotion.update({
      where: { id },
      data: { is_active },
    });
  }

  // ── Details ──────────────────────────────────

  async findDetail(promotionId: string, productId: string) {
    return this.db.promotionDetail.findFirst({
      where: { promotion_id: promotionId, product_id: productId },
    });
  }

  async findByProduct(productId: string) {
    return this.db.promotionDetail.findMany({
      where: { product_id: productId },
      include: {
        promotion: true,
      },
    });
  }

  async addProduct(promotionId: string, dto: AddProductDto) {
    return this.db.promotionDetail.create({
      data: {
        promotion_id: promotionId,
        product_id: dto.product_id,
        discount_percent: dto.discount_percent,
      },
      include: {
        product: { select: { id: true, name: true, base_price: true } },
      },
    });
  }

  async updateProduct(
    promotionId: string,
    productId: string,
    dto: UpdateProductDto,
  ) {
    return this.db.promotionDetail.updateMany({
      where: { promotion_id: promotionId, product_id: productId },
      data: { discount_percent: dto.discount_percent },
    });
  }

  async removeProduct(promotionId: string, productId: string) {
    return this.db.promotionDetail.deleteMany({
      where: { promotion_id: promotionId, product_id: productId },
    });
  }
}
