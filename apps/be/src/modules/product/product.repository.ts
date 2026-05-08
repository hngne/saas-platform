import { PrismaClient as RetailClient } from "../../../generated/retail-client";
import { getCategoryScopeIds } from "@/shared/utils/category.util";
import { removeVietnameseTones } from "@/shared/utils/string.util";
import { buildPaginationMeta } from "@/shared/utils/pagination.util";
import {
  CreateProductDto,
  CreateVariantDto,
  ProductFilterDto,
  UpdateProductDto,
  UpdateVariantDto,
} from "./product.validator";

export class ProductRepository {
  constructor(private db: RetailClient) {}

  private async withReviewStats<T extends { id: string }>(products: T[]): Promise<Array<T & { rating_avg: number; review_count: number }>> {
    if (!products.length) return [];

    const productIds = products.map((product) => product.id);
    const stats = await this.db.review.groupBy({
      by: ["product_id"],
      where: {
        product_id: { in: productIds },
        is_visible: true,
      },
      _avg: { rating: true },
      _count: { _all: true },
    });
    const statsByProductId = new Map(
      stats.map((item) => [
        item.product_id,
        {
          rating_avg: Number((item._avg.rating || 0).toFixed(1)),
          review_count: item._count._all,
        },
      ]),
    );

    return products.map((product) => ({
      ...product,
      rating_avg: statsByProductId.get(product.id)?.rating_avg || 0,
      review_count: statsByProductId.get(product.id)?.review_count || 0,
    }));
  }

  async findAll(filter: ProductFilterDto) {
    const {
      page,
      limit,
      search,
      category_id,
      min_price,
      max_price,
      is_active,
      has_variant,
      sort_by,
      sort_order,
    } = filter;

    const categoryIds = await getCategoryScopeIds(this.db, category_id);

    const where: any = {
      deleted_at: null,
      ...(is_active !== undefined && { is_active }),
      ...(has_variant !== undefined && { has_variant }),
      ...(categoryIds.length && { category_id: { in: categoryIds } }),
      ...(min_price !== undefined && { base_price: { gte: min_price } }),
      ...(max_price !== undefined && {
        base_price: {
          ...(min_price !== undefined ? { gte: min_price } : {}),
          lte: max_price,
        },
      }),
    };

    // Tìm kiếm: match tên sản phẩm HOẶC sản phẩm thuộc danh mục (kể cả con) có tên khớp
    if (search) {
      const normalizedSearch = removeVietnameseTones(search);
      const allCategories = await this.db.category.findMany({
        select: { id: true, name: true, parent_id: true },
      });
      const matchedParents = allCategories.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()),
      );

      // Lấy tất cả ID danh mục con cháu của các danh mục khớp
      const matchedCategoryIds = new Set<string>();
      const queue = matchedParents.map((c) => c.id);
      queue.forEach((id) => matchedCategoryIds.add(id));
      while (queue.length) {
        const currentId = queue.shift()!;
        for (const cat of allCategories) {
          if (cat.parent_id === currentId && !matchedCategoryIds.has(cat.id)) {
            matchedCategoryIds.add(cat.id);
            queue.push(cat.id);
          }
        }
      }

      const orConditions: any[] = [
        { search_name: { contains: normalizedSearch } },
      ];
      if (matchedCategoryIds.size > 0) {
        orConditions.push({ category_id: { in: Array.from(matchedCategoryIds) } });
      }
      where.OR = orConditions;
    }

    const [data, total] = await Promise.all([
      this.db.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
          images: { orderBy: { sort_order: "asc" }, take: 1 },
          promotion_details: {
            where: {
              promotion: {
                is_active: true,
                OR: [
                  { start_date: null, end_date: null },
                  { start_date: { lte: new Date() }, end_date: { gte: new Date() } },
                ],
              },
            },
            include: { promotion: true },
          },
          variants: {
            where: { is_active: true },
            select: { id: true, price: true, stock: true },
          },
        },
        orderBy: { [sort_by]: sort_order },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.db.product.count({ where }),
    ]);

    return { data: await this.withReviewStats(data), meta: buildPaginationMeta(total, page, limit) };
  }

  async findById(id: string) {
    const product = await this.db.product.findFirst({
      where: { id, deleted_at: null },
      include: {
        category: true,
        images: { orderBy: { sort_order: "asc" } },
        variants: {
          include: {
            variant_values: {
              include: {
                attribute_value: {
                  include: { attribute: true },
                },
              },
            },
          },
        },
        promotion_details: {
          where: {
            promotion: {
              is_active: true,
              OR: [
                { start_date: null, end_date: null },
                { start_date: { lte: new Date() }, end_date: { gte: new Date() } },
              ],
            },
          },
          include: { promotion: true },
        },
      },
    });
    if (!product) return product;
    return (await this.withReviewStats([product]))[0];
  }

  async findByIdentifier(identifier: string) {
    const product = await this.db.product.findFirst({
      where: {
        deleted_at: null,
        OR: [{ id: identifier }, { slug: identifier }],
      },
      include: {
        category: true,
        images: { orderBy: { sort_order: "asc" } },
        promotion_details: {
          where: {
            promotion: {
              is_active: true,
              OR: [
                { start_date: null, end_date: null },
                { start_date: { lte: new Date() }, end_date: { gte: new Date() } },
              ],
            },
          },
          include: { promotion: true },
        },
        variants: {
          include: {
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
    });
    if (!product) return product;
    return (await this.withReviewStats([product]))[0];
  }

  async findBySlug(slug: string) {
    return this.db.product.findUnique({ where: { slug } });
  }

  async findByName(name: string, excludeId?: string) {
    return this.db.product.findFirst({
      where: {
        name,
        deleted_at: null,
        ...(excludeId && { id: { not: excludeId } }),
      },
    });
  }

  async create(
    dto: Omit<CreateProductDto, "variants"> & {
      id: string;
      slug: string;
      search_name: string;
    },
  ) {
    return this.db.product.create({
      data: {
        id: dto.id,
        name: dto.name,
        slug: dto.slug,
        search_name: dto.search_name,
        description: dto.description,
        base_price: dto.base_price,
        category_id: dto.category_id,
        has_variant: dto.has_variant,
        material: dto.material,
      },
    });
  }

  async createImages(productId: string, urls: string[], startSortOrder = 0) {
    return this.db.productImage.createMany({
      data: urls.map((url, index) => ({
        product_id: productId,
        url,
        sort_order: startSortOrder + index,
      })),
    });
  }

  async createVariant(
    productId: string,
    dto: CreateVariantDto & { attribute_value_ids: string[] },
  ) {
    return this.db.productVariant.create({
      data: {
        product_id: productId,
        sku_code: dto.sku_code,
        price: dto.price,
        stock: dto.stock,
        image_url: dto.image_url,
        variant_values: {
          create: dto.attribute_value_ids.map((valueId) => ({
            attribute_value_id: valueId,
          })),
        },
      },
      include: {
        variant_values: {
          include: {
            attribute_value: { include: { attribute: true } },
          },
        },
      },
    });
  }

  async update(id: string, dto: UpdateProductDto & { search_name?: string }) {
    return this.db.product.update({ where: { id }, data: dto });
  }

  async softDelete(id: string) {
    return this.db.product.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }

  async toggleActive(id: string, is_active: boolean) {
    return this.db.product.update({ where: { id }, data: { is_active } });
  }

  // ── Variants ──────────────────────────────────

  async findVariantById(id: string) {
    return this.db.productVariant.findUnique({
      where: { id },
      include: {
        variant_values: true,
      },
    });
  }

  async findSkuCode(skuCode: string, excludeId?: string) {
    return this.db.productVariant.findFirst({
      where: {
        sku_code: skuCode,
        ...(excludeId && { id: { not: excludeId } }),
      },
    });
  }

  async updateVariant(
    id: string,
    dto: UpdateVariantDto & { attribute_value_ids?: string[] },
  ) {
    const { attribute_value_ids, ...data } = dto;

    return this.db.productVariant.update({
      where: { id },
      data: {
        ...data,
        ...(attribute_value_ids
          ? {
              variant_values: {
                deleteMany: {},
                create: attribute_value_ids.map((valueId) => ({
                  attribute_value_id: valueId,
                })),
              },
            }
          : {}),
      },
      include: {
        variant_values: {
          include: {
            attribute_value: { include: { attribute: true } },
          },
        },
      },
    });
  }

  async deleteVariant(id: string) {
    return this.db.productVariant.delete({ where: { id } });
  }

  async toggleVariant(id: string, is_active: boolean) {
    return this.db.productVariant.update({
      where: { id },
      data: { is_active },
    });
  }

  async countVariants(productId: string) {
    return this.db.productVariant.count({ where: { product_id: productId } });
  }

  async hasOrderItems(variantId: string) {
    const count = await this.db.orderItem.count({
      where: { variant_id: variantId },
    });
    return count > 0;
  }

  // ── Images ──────────────────────────────────

  async findImageById(id: string) {
    return this.db.productImage.findUnique({ where: { id } });
  }

  async countImages(productId: string) {
    return this.db.productImage.count({ where: { product_id: productId } });
  }

  async deleteImage(id: string) {
    return this.db.productImage.delete({ where: { id } });
  }
}
