import { PrismaClient as RetailClient } from "../../../generated/retail-client";
import { CustomerRegisterDto } from "./customer-auth.validator";

export class CustomerAuthRepository {
  constructor(private db: RetailClient) {}

  async findByEmail(email: string) {
    return this.db.customer.findUnique({
      where: { email },
    });
  }

  async findByIdWithAddresses(id: string) {
    return this.db.customer.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar_url: true,
        status: true,
        created_at: true,
        addresses: true,
      },
    });
  }

  async createCustomer(data: CustomerRegisterDto, hashedPassword: string) {
    return this.db.customer.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        phone: data.phone,
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar_url: true,
        created_at: true,
      },
    });
  }

  async updateProfile(id: string, data: { name?: string; phone?: string }) {
    return this.db.customer.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar_url: true,
      },
    });
  }

  async findByIdForPassword(id: string) {
    return this.db.customer.findUnique({
      where: { id },
    });
  }

  async updatePassword(id: string, hashedPassword: string) {
    return this.db.customer.update({
      where: { id },
      data: { password: hashedPassword },
    });
  }
}
