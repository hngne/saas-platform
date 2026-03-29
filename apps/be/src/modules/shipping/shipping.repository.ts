import { PrismaClient as RetailClient } from "../../../generated/retail-client";
import { CreateShippingDto, UpdateShippingDto } from "./shipping.validator";

export class ShippingRepository {
  constructor(private db: RetailClient) {}

  async findAll() {
    return this.db.shippingMethod.findMany({
      orderBy: { created_at: "asc" },
    });
  }

  async findById(id: string) {
    return this.db.shippingMethod.findUnique({ where: { id } });
  }

  async findByName(name: string, excludeId?: string) {
    return this.db.shippingMethod.findFirst({
      where: {
        name,
        ...(excludeId && { id: { not: excludeId } }),
      },
    });
  }

  async create(dto: CreateShippingDto) {
    return this.db.shippingMethod.create({ data: dto });
  }

  async update(id: string, dto: UpdateShippingDto) {
    return this.db.shippingMethod.update({ where: { id }, data: dto });
  }

  async delete(id: string) {
    return this.db.shippingMethod.delete({ where: { id } });
  }

  async isUsedInOrder(id: string) {
    const count = await this.db.order.count({
      where: { shipping_method_id: id },
    });
    return count > 0;
  }
}
