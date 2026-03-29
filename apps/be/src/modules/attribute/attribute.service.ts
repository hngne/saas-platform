import { BadRequestException, NotFoundException } from "@/shared/exceptions";
import { PrismaClient as RetailClient } from "../../../generated/retail-client";
import { AttributeRepository } from "./attribute.repository";
import {
  CreateAttributeDto,
  CreateAttributeValueDto,
  UpdateAttributeDto,
  UpdateAttributeValueDto,
} from "./attribute.validator";

export class AttributeService {
  private repo: AttributeRepository;

  constructor(db: RetailClient) {
    this.repo = new AttributeRepository(db);
  }

  getAll = async () => {
    return this.repo.findAll();
  };

  getById = async (id: string) => {
    const attribute = await this.repo.findById(id);
    if (!attribute) throw new NotFoundException("Thuộc tính không tồn tại");
    return attribute;
  };

  create = async (dto: CreateAttributeDto) => {
    const existing = await this.repo.findByName(dto.name);
    if (existing) throw new BadRequestException("Tên thuộc tính đã tồn tại");
    return this.repo.create(dto);
  };

  update = async (id: string, dto: UpdateAttributeDto) => {
    await this.getById(id);
    if (dto.name) {
      const existing = await this.repo.findByName(dto.name);
      if (existing && existing.id !== id) {
        throw new BadRequestException("Tên thuộc tính đã tồn tại");
      }
    }
    return this.repo.update(id, dto);
  };

  delete = async (id: string) => {
    await this.getById(id);
    const isUsed = await this.repo.isAttributeUsedInVariant(id);
    if (isUsed) {
      throw new BadRequestException(
        "Thuộc tính đang được dùng trong biến thể sản phẩm, không thể xóa",
      );
    }
    return this.repo.delete(id);
  };

  // ── Attribute Values ──────────────────────────

  createValue = async (attributeId: string, dto: CreateAttributeValueDto) => {
    await this.getById(attributeId);
    const existing = await this.repo.findValueByName(attributeId, dto.value);
    if (existing)
      throw new BadRequestException("Giá trị đã tồn tại trong thuộc tính này");
    return this.repo.createValue(attributeId, dto);
  };

  updateValue = async (
    attributeId: string,
    valueId: string,
    dto: UpdateAttributeValueDto,
  ) => {
    await this.getById(attributeId);
    const value = await this.repo.findValueById(valueId);
    if (!value || value.attribute_id !== attributeId) {
      throw new NotFoundException("Giá trị thuộc tính không tồn tại");
    }
    if (dto.value && dto.value !== value.value) {
      const existing = await this.repo.findValueByName(attributeId, dto.value);
      if (existing)
        throw new BadRequestException(
          "Giá trị đã tồn tại trong thuộc tính này",
        );
    }
    return this.repo.updateValue(valueId, dto);
  };

  deleteValue = async (attributeId: string, valueId: string) => {
    await this.getById(attributeId);
    const value = await this.repo.findValueById(valueId);
    if (!value || value.attribute_id !== attributeId) {
      throw new NotFoundException("Giá trị thuộc tính không tồn tại");
    }
    const isUsed = await this.repo.isValueUsedInVariant(valueId);
    if (isUsed) {
      throw new BadRequestException(
        "Giá trị đang được dùng trong biến thể sản phẩm, không thể xóa",
      );
    }
    return this.repo.deleteValue(valueId);
  };
}
