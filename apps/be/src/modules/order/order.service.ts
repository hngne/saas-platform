import { BadRequestException, NotFoundException } from "@/shared/exceptions";
import { PrismaClient as RetailClient } from "../../../generated/retail-client";
import { OrderRepository } from "./order.repository";
import { OrderFilterDto, UpdateOrderStatusDto } from "./order.validator";

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export class OrderService {
  private repo: OrderRepository;

  constructor(db: RetailClient) {
    this.repo = new OrderRepository(db);
  }

  getAll = async (filter: OrderFilterDto) => {
    return this.repo.findAll(filter);
  };

  getById = async (id: string) => {
    const order = await this.repo.findById(id);
    if (!order) throw new NotFoundException("Đơn hàng không tồn tại");
    return order;
  };

  updateStatus = async (
    id: string,
    dto: UpdateOrderStatusDto,
    userId: string,
  ) => {
    const order = await this.getById(id);

    const allowed = VALID_TRANSITIONS[order.order_status] ?? [];
    if (!allowed.includes(dto.order_status)) {
      throw new BadRequestException(
        `Không thể chuyển từ "${order.order_status}" sang "${dto.order_status}"`,
      );
    }

    // Hủy đơn → hoàn kho + hoàn voucher
    if (dto.order_status === "CANCELLED") {
      await this.repo.restoreStock(id, userId);
      await this.repo.restoreVoucher(id);
    }

    return this.repo.updateStatus(id, dto.order_status);
  };

  countByStatus = async () => {
    return this.repo.countByStatus();
  };
}
