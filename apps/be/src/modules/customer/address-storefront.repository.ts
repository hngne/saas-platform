import { PrismaClient as RetailClient } from "../../../generated/retail-client";

export class AddressStorefrontRepository {
  constructor(private db: RetailClient) {}

  async findAddressesByCustomer(customerId: string) {
    return this.db.customerAddress.findMany({
      where: { customer_id: customerId },
      orderBy: [{ is_default: "desc" }, { created_at: "desc" }],
    });
  }

  async countAddresses(customerId: string) {
    return this.db.customerAddress.count({
      where: { customer_id: customerId },
    });
  }

  async findAddressById(id: string, customerId: string) {
    return this.db.customerAddress.findFirst({
      where: { id, customer_id: customerId },
    });
  }

  async clearDefaultAddress(customerId: string) {
    return this.db.customerAddress.updateMany({
      where: { customer_id: customerId, is_default: true },
      data: { is_default: false },
    });
  }

  async createAddress(customerId: string, data: any) {
    return this.db.customerAddress.create({
      data: {
        ...data,
        customer_id: customerId,
      },
    });
  }

  async updateAddress(id: string, _customerId: string, data: any) {
    return this.db.customerAddress.update({
      where: { id },
      data,
    });
  }

  async deleteAddress(id: string, _customerId: string) {
    return this.db.customerAddress.delete({
      where: { id },
    });
  }
}
