import { PrismaClient as RetailClient } from "../../../generated/retail-client";
import { NotFoundException } from "@/shared/exceptions";
import { CustomerFilterDto } from "./customer.validator";
import { CustomerRepository } from "./customer.repository";

export class CustomerService {
  private repo: CustomerRepository;

  constructor(db: RetailClient) {
    this.repo = new CustomerRepository(db);
  }

  getAll = async (filter: CustomerFilterDto) => {
    return this.repo.findAll(filter);
  };

  getSummary = async () => {
    return this.repo.getSummary();
  };

  getById = async (id: string) => {
    const customer = await this.repo.findById(id);
    if (!customer) throw new NotFoundException("Không tìm thấy người dùng");

    const orderCount = customer._count.orders;
    const reviewCount = customer._count.reviews;
    return {
      ...customer,
      order_count: orderCount,
      review_count: reviewCount,
      total_spent: customer.orders.reduce(
        (sum, order) => sum + Number(order.total ?? 0),
        0,
      ),
      _count: undefined,
    };
  };

  updateStatus = async (id: string, status: string) => {
    await this.getById(id);
    const updated = await this.repo.updateStatus(id, status);

    if (status !== "ACTIVE") {
      await this.repo.deleteRefreshTokens(id);
    }

    return updated;
  };
}
