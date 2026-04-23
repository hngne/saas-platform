import { randomUUID } from "crypto";
import { BadRequestException, NotFoundException } from "@/shared/exceptions";
import { PrismaClient as RetailClient } from "../../../generated/retail-client";
import { cloudinary } from "@/configs/cloudinary";
import { generateSlug } from "@/shared/utils/generateSlug";
import { removeVietnameseTones } from "@/shared/utils/string.util";
import { ProductRepository } from "./product.repository";
import {
  CreateProductDto,
  CreateVariantDto,
  ProductFilterDto,
  UpdateProductDto,
  UpdateVariantDto,
} from "./product.validator";

export class ProductService {
  private repo: ProductRepository;

  constructor(db: RetailClient) {
    this.repo = new ProductRepository(db);
  }

  getAll = async (filter: ProductFilterDto) => {
    return this.repo.findAll(filter);
  };

  getById = async (id: string) => {
    const product = await this.repo.findByIdentifier(id);
    if (!product) throw new NotFoundException("Sản phẩm không tồn tại");
    return product;
  };

  create = async (dto: CreateProductDto, files: Express.Multer.File[]) => {
    // Check tên trùng
    const existing = await this.repo.findByName(dto.name);
    if (existing) throw new BadRequestException("Tên sản phẩm đã tồn tại");

    // Validate variants nếu has_variant = true
    if (dto.has_variant && (!dto.variants || dto.variants.length === 0)) {
      throw new BadRequestException(
        "Sản phẩm có biến thể phải có ít nhất 1 biến thể",
      );
    }

    // Upload ảnh lên Cloudinary
    const imageUrls = files.map((f: any) => f.path);

    // Generate slug unique
    const slug = await this.generateUniqueSlug(dto.name);
    const id = randomUUID();

    // Tạo product
    const product = await this.repo.create({
      id,
      name: dto.name,
      slug,
      search_name: removeVietnameseTones(dto.name),
      description: dto.description,
      base_price: dto.base_price,
      category_id: dto.category_id,
      has_variant: dto.has_variant,
      material: dto.material,
    });

    // Lưu ảnh
    if (imageUrls.length > 0) {
      await this.repo.createImages(id, imageUrls);
    }

    // Tạo variants
    if (dto.has_variant && dto.variants && dto.variants.length > 0) {
      this.validateVariantCombinations(dto.variants);

      for (let index = 0; index < dto.variants.length; index++) {
        const v = dto.variants[index];
        await this.repo.createVariant(id, {
          sku_code: await this.resolveVariantSku(v.sku_code, slug, index),
          price: v.price ?? dto.base_price,
          stock: v.stock,
          image_url: v.image_url ?? null,
          attribute_value_ids: [...new Set(v.attribute_value_ids)],
        });
      }
    } else {
      // Tạo variant mặc định nếu không có biến thể
      await this.repo.createVariant(id, {
        sku_code: null,
        price: dto.base_price,
        stock: dto.variants?.[0]?.stock ?? 0,
        image_url: null,
        attribute_value_ids: [],
      });
    }

    return this.repo.findById(id);
  };

  update = async (id: string, dto: UpdateProductDto, files: Express.Multer.File[] = []) => {
    await this.getById(id);
    if (dto.name) {
      const existing = await this.repo.findByName(dto.name, id);
      if (existing) throw new BadRequestException("Tên sản phẩm đã tồn tại");
    }
    const product = await this.repo.update(id, {
      ...dto,
      ...(dto.name && { search_name: removeVietnameseTones(dto.name) }),
    });

    const imageUrls = files.map((f: any) => f.path).filter(Boolean);
    if (imageUrls.length > 0) {
      const imageCount = await this.repo.countImages(id);
      await this.repo.createImages(id, imageUrls, imageCount);
    }

    return product;
  };

  delete = async (id: string) => {
    await this.getById(id);
    return this.repo.softDelete(id);
  };

  toggleActive = async (id: string, is_active: boolean) => {
    await this.getById(id);
    return this.repo.toggleActive(id, is_active);
  };

  // ── Variants ──────────────────────────────────

  addVariant = async (productId: string, dto: CreateVariantDto) => {
    const product = await this.getById(productId);
    const attributeValueIds = [...new Set(dto.attribute_value_ids)];

    this.assertVariantCombinationUnique(product, attributeValueIds);

    if (dto.sku_code) {
      const existing = await this.repo.findSkuCode(dto.sku_code);
      if (existing) throw new BadRequestException("SKU code đã tồn tại");
    }

    return this.repo.createVariant(productId, {
      ...dto,
      sku_code: await this.resolveVariantSku(dto.sku_code, product.slug),
      price: dto.price ?? Number(product.base_price),
      image_url: dto.image_url ?? null,
      attribute_value_ids: attributeValueIds,
    });
  };

  updateVariant = async (
    productId: string,
    variantId: string,
    dto: UpdateVariantDto,
  ) => {
    const product = await this.getById(productId);
    const variant = await this.repo.findVariantById(variantId);
    if (!variant || variant.product_id !== productId) {
      throw new NotFoundException("Biến thể không tồn tại");
    }
    if (dto.sku_code && dto.sku_code !== variant.sku_code) {
      const existing = await this.repo.findSkuCode(dto.sku_code, variantId);
      if (existing) throw new BadRequestException("SKU code đã tồn tại");
    }

    if (dto.attribute_value_ids !== undefined) {
      this.assertVariantCombinationUnique(
        product,
        [...new Set(dto.attribute_value_ids)],
        variantId,
      );
    }

    return this.repo.updateVariant(variantId, {
      ...dto,
      ...(dto.sku_code !== undefined && {
        sku_code: await this.resolveVariantSku(
          dto.sku_code,
          product.slug,
          undefined,
          variantId,
        ),
      }),
      ...(dto.price === null && { price: Number(product.base_price) }),
      ...(dto.image_url === undefined ? {} : { image_url: dto.image_url ?? null }),
      ...(dto.attribute_value_ids !== undefined && {
        attribute_value_ids: [...new Set(dto.attribute_value_ids)],
      }),
    });
  };

  deleteVariant = async (productId: string, variantId: string) => {
    await this.getById(productId);
    const variant = await this.repo.findVariantById(variantId);
    if (!variant || variant.product_id !== productId) {
      throw new NotFoundException("Biến thể không tồn tại");
    }
    const count = await this.repo.countVariants(productId);
    if (count <= 1) {
      throw new BadRequestException(
        "Không thể xóa biến thể cuối cùng của sản phẩm",
      );
    }
    const hasOrders = await this.repo.hasOrderItems(variantId);
    if (hasOrders) {
      throw new BadRequestException(
        "Biến thể đã có trong đơn hàng, không thể xóa",
      );
    }
    return this.repo.deleteVariant(variantId);
  };

  toggleVariant = async (
    productId: string,
    variantId: string,
    is_active: boolean,
  ) => {
    await this.getById(productId);
    const variant = await this.repo.findVariantById(variantId);
    if (!variant || variant.product_id !== productId) {
      throw new NotFoundException("Biến thể không tồn tại");
    }
    return this.repo.toggleVariant(variantId, is_active);
  };

  // ── Images ──────────────────────────────────

  deleteImage = async (productId: string, imageId: string) => {
    await this.getById(productId);
    const image = await this.repo.findImageById(imageId);
    if (!image || image.product_id !== productId) {
      throw new NotFoundException("Ảnh không tồn tại");
    }
    // Xóa trên Cloudinary
    const publicId = image.url.split("/").slice(-2).join("/").split(".")[0];
    await cloudinary.uploader.destroy(publicId).catch(() => {});
    return this.repo.deleteImage(imageId);
  };

  // ── Private ──────────────────────────────────

  private async generateUniqueSlug(name: string) {
    let slug = generateSlug(name);
    let existing = await this.repo.findBySlug(slug);
    let counter = 1;
    while (existing) {
      slug = `${generateSlug(name)}-${counter++}`;
      existing = await this.repo.findBySlug(slug);
    }
    return slug;
  }

  private normalizeSkuCode(skuCode?: string | null) {
    const normalized = skuCode?.trim();
    return normalized ? normalized : null;
  }

  private async resolveVariantSku(
    skuCode: string | null | undefined,
    productSlug: string,
    index = 0,
    excludeId?: string,
  ) {
    const manualSku = this.normalizeSkuCode(skuCode);
    if (manualSku) {
      const existing = await this.repo.findSkuCode(manualSku, excludeId);
      if (existing) throw new BadRequestException("SKU code đã tồn tại");
      return manualSku;
    }

    let generated = "";
    do {
      const suffix = randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
      generated = `${productSlug.toUpperCase()}-${index + 1}-${suffix}`;
    } while (await this.repo.findSkuCode(generated, excludeId));

    return generated;
  }

  private validateVariantCombinations(variants: CreateProductDto["variants"]) {
    const seen = new Set<string>();

    for (const variant of variants ?? []) {
      const key = this.buildVariantCombinationKey(variant.attribute_value_ids);
      if (seen.has(key)) {
        throw new BadRequestException("Có biến thể bị trùng tổ hợp thuộc tính");
      }
      seen.add(key);
    }
  }

  private assertVariantCombinationUnique(
    product: Awaited<ReturnType<ProductRepository["findByIdentifier"]>>,
    attributeValueIds: string[],
    excludeVariantId?: string,
  ) {
    const nextKey = this.buildVariantCombinationKey(attributeValueIds);

    const duplicated = product?.variants?.some((variant) => {
      if (excludeVariantId && variant.id === excludeVariantId) return false;

      const currentIds =
        variant.variant_values?.map((item: any) => item.attribute_value_id) || [];

      return this.buildVariantCombinationKey(currentIds) === nextKey;
    });

    if (duplicated) {
      throw new BadRequestException("Tổ hợp thuộc tính của biến thể đã tồn tại");
    }
  }

  private buildVariantCombinationKey(attributeValueIds: string[]) {
    return [...new Set(attributeValueIds)].sort().join("|");
  }
}
