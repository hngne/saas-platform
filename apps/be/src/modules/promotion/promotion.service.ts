import { BadRequestException, NotFoundException } from "@/shared/exceptions";
import { PrismaClient as RetailClient } from "../../../generated/retail-client";
import { PromotionRepository } from "./promotion.repository";
import {
  AddProductDto,
  CreatePromotionDto,
  PromotionFilterDto,
  UpdateProductDto,
  UpdatePromotionDto,
} from "./promotion.validator";

export class PromotionService {
  private repo: PromotionRepository;

  constructor(db: RetailClient) {
    this.repo = new PromotionRepository(db);
  }

  getAll = async (filter: PromotionFilterDto) => {
    return this.repo.findAll(filter);
  };

  getById = async (id: string) => {
    const promotion = await this.repo.findById(id);
    if (!promotion) throw new NotFoundException("Khuyến mãi không tồn tại");
    return promotion;
  };

  create = async (dto: CreatePromotionDto) => {
    const existing = await this.repo.findByName(dto.name);
    if (existing) throw new BadRequestException("Tên khuyến mãi đã tồn tại");
    return this.repo.create(dto);
  };

  update = async (id: string, dto: UpdatePromotionDto) => {
    await this.getById(id);
    if (dto.name) {
      const existing = await this.repo.findByName(dto.name, id);
      if (existing) throw new BadRequestException("Tên khuyến mãi đã tồn tại");
    }
    return this.repo.update(id, dto);
  };

  delete = async (id: string) => {
    await this.getById(id);
    return this.repo.delete(id);
  };

  toggleActive = async (id: string, is_active: boolean) => {
    await this.getById(id);
    return this.repo.toggleActive(id, is_active);
  };

  // ── Details ──────────────────────────────────

  getByProduct = async (productId: string) => {
    const details = await this.repo.findByProduct(productId);
    if (!details.length)
      throw new NotFoundException("Sản phẩm chưa có trong khuyến mãi nào");
    return details;
  };

  addProduct = async (promotionId: string, dto: AddProductDto) => {
    await this.getById(promotionId);
    const existing = await this.repo.findDetail(promotionId, dto.product_id);
    if (existing)
      throw new BadRequestException("Sản phẩm đã có trong khuyến mãi này");
    return this.repo.addProduct(promotionId, dto);
  };

  updateProduct = async (
    promotionId: string,
    productId: string,
    dto: UpdateProductDto,
  ) => {
    await this.getById(promotionId);
    const existing = await this.repo.findDetail(promotionId, productId);
    if (!existing)
      throw new NotFoundException("Sản phẩm không có trong khuyến mãi này");
    return this.repo.updateProduct(promotionId, productId, dto);
  };

  removeProduct = async (promotionId: string, productId: string) => {
    await this.getById(promotionId);
    const existing = await this.repo.findDetail(promotionId, productId);
    if (!existing)
      throw new NotFoundException("Sản phẩm không có trong khuyến mãi này");
    return this.repo.removeProduct(promotionId, productId);
  };
}
