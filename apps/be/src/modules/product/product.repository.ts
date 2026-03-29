import { PrismaClient as RetailClient } from "../../../generated/retail-client";
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

    const where: any = {
      deleted_at: null,
      ...(is_active !== undefined && { is_active }),
      ...(has_variant !== undefined && { has_variant }),
      ...(category_id && { category_id }),
      ...(min_price !== undefined && { base_price: { gte: min_price } }),
      ...(max_price !== undefined && {
        base_price: {
          ...(min_price !== undefined ? { gte: min_price } : {}),
          lte: max_price,
        },
      }),
      ...(search && {
        search_name: {
          contains: removeVietnameseTones(search),
        },
      }),
    };

    const [data, total] = await Promise.all([
      this.db.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
          images: { orderBy: { sort_order: "asc" }, take: 1 },
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

    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async findById(id: string) {
    return this.db.product.findFirst({
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
      },
    });
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

  async createImages(productId: string, urls: string[]) {
    return this.db.productImage.createMany({
      data: urls.map((url, index) => ({
        product_id: productId,
        url,
        sort_order: index,
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

  async updateVariant(id: string, dto: UpdateVariantDto) {
    return this.db.productVariant.update({ where: { id }, data: dto });
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

  async deleteImage(id: string) {
    return this.db.productImage.delete({ where: { id } });
  }
}
