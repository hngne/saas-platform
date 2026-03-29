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
    const product = await this.repo.findById(id);
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
      for (const v of dto.variants) {
        await this.repo.createVariant(id, {
          sku_code: v.sku_code,
          price: v.price,
          stock: v.stock,
          image_url: v.image_url,
          attribute_value_ids: v.attribute_value_ids,
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

  update = async (id: string, dto: UpdateProductDto) => {
    await this.getById(id);
    if (dto.name) {
      const existing = await this.repo.findByName(dto.name, id);
      if (existing) throw new BadRequestException("Tên sản phẩm đã tồn tại");
    }
    return this.repo.update(id, {
      ...dto,
      ...(dto.name && { search_name: removeVietnameseTones(dto.name) }),
    });
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
    await this.getById(productId);

    if (dto.sku_code) {
      const existing = await this.repo.findSkuCode(dto.sku_code);
      if (existing) throw new BadRequestException("SKU code đã tồn tại");
    }

    return this.repo.createVariant(productId, dto);
  };

  updateVariant = async (
    productId: string,
    variantId: string,
    dto: UpdateVariantDto,
  ) => {
    await this.getById(productId);
    const variant = await this.repo.findVariantById(variantId);
    if (!variant || variant.product_id !== productId) {
      throw new NotFoundException("Biến thể không tồn tại");
    }
    if (dto.sku_code && dto.sku_code !== variant.sku_code) {
      const existing = await this.repo.findSkuCode(dto.sku_code, variantId);
      if (existing) throw new BadRequestException("SKU code đã tồn tại");
    }
    return this.repo.updateVariant(variantId, dto);
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
}
