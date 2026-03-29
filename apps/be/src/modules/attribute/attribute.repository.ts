import { PrismaClient as RetailClient } from "../../../generated/retail-client";
import {
  CreateAttributeDto,
  CreateAttributeValueDto,
  UpdateAttributeDto,
  UpdateAttributeValueDto,
} from "./attribute.validator";

export class AttributeRepository {
  constructor(private db: RetailClient) {}

  async findAll() {
    return this.db.productAttribute.findMany({
      include: { values: true },
      orderBy: { created_at: "asc" },
    });
  }

  async findById(id: string) {
    return this.db.productAttribute.findUnique({
      where: { id },
      include: { values: true },
    });
  }

  async findByName(name: string) {
    return this.db.productAttribute.findFirst({
      where: { name },
    });
  }

  async create(dto: CreateAttributeDto) {
    return this.db.productAttribute.create({
      data: {
        name: dto.name,
        values: {
          create: dto.values.map((v) => ({
            value: v.value,
            color_hex: v.color_hex,
          })),
        },
      },
      include: { values: true },
    });
  }

  async update(id: string, dto: UpdateAttributeDto) {
    return this.db.productAttribute.update({
      where: { id },
      data: { name: dto.name },
      include: { values: true },
    });
  }

  async delete(id: string) {
    return this.db.productAttribute.delete({ where: { id } });
  }

  // ── Attribute Values ──────────────────────────

  async findValueById(id: string) {
    return this.db.productAttributeValue.findUnique({ where: { id } });
  }

  async findValueByName(attributeId: string, value: string) {
    return this.db.productAttributeValue.findFirst({
      where: { attribute_id: attributeId, value },
    });
  }

  async createValue(attributeId: string, dto: CreateAttributeValueDto) {
    return this.db.productAttributeValue.create({
      data: {
        attribute_id: attributeId,
        value: dto.value,
        color_hex: dto.color_hex,
      },
    });
  }

  async updateValue(id: string, dto: UpdateAttributeValueDto) {
    return this.db.productAttributeValue.update({
      where: { id },
      data: dto,
    });
  }

  async deleteValue(id: string) {
    return this.db.productAttributeValue.delete({ where: { id } });
  }

  async isValueUsedInVariant(id: string) {
    const count = await this.db.productVariantValue.count({
      where: { attribute_value_id: id },
    });
    return count > 0;
  }

  async isAttributeUsedInVariant(attributeId: string) {
    const values = await this.db.productAttributeValue.findMany({
      where: { attribute_id: attributeId },
      select: { id: true },
    });
    const ids = values.map((v) => v.id);
    if (ids.length === 0) return false;
    const count = await this.db.productVariantValue.count({
      where: { attribute_value_id: { in: ids } },
    });
    return count > 0;
  }
}
