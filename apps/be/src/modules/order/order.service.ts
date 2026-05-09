import { BadRequestException, NotFoundException } from "@/shared/exceptions";
import { PrismaClient as RetailClient } from "../../../generated/retail-client";
import { OrderRepository } from "./order.repository";
import { OrderFilterDto, OrderStatus, UpdateOrderStatusDto } from "./order.validator";

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "DELIVERED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  COMPLETED: [],
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

    const isPickup = !!(order as any).pickup_store;
    const allowed = VALID_TRANSITIONS[order.order_status as OrderStatus] ?? [];
    if (!allowed.includes(dto.order_status)) {
      throw new BadRequestException(
        `Không thể chuyển từ "${order.order_status}" sang "${dto.order_status}"`,
      );
    }

    // Đơn giao hàng (không pickup) không được skip SHIPPED
    if (
      dto.order_status === "DELIVERED" &&
      order.order_status === "PROCESSING" &&
      !isPickup
    ) {
      throw new BadRequestException(
        "Đơn giao hàng phải qua trạng thái 'Đang giao' trước khi xác nhận đã giao",
      );
    }

    if (
      dto.order_status === "PROCESSING" &&
      order.payment_method === "VNPAY" &&
      order.payment_status !== "PAID"
    ) {
      throw new BadRequestException(
        "Đơn VNPay chỉ được xác nhận sau khi thanh toán thành công",
      );
    }

    // Hủy đơn → hoàn kho + hoàn voucher
    let nextPaymentStatus: "FAILED" | "PAID" | undefined;

    if (dto.order_status === "CANCELLED") {
      await this.repo.restoreStock(id, userId);
      await this.repo.restoreVoucher(id);

      if (
        order.payment_method === "VNPAY" &&
        ["PENDING", "FAILED"].includes(order.payment_status)
      ) {
        nextPaymentStatus = "FAILED";
      }
    }

    if (dto.order_status === "DELIVERED" && order.payment_method === "COD") {
      nextPaymentStatus = "PAID";
    }

    return this.repo.updateStatus(id, dto.order_status, nextPaymentStatus);
  };

  countByStatus = async () => {
    return this.repo.countByStatus();
  };

  getSummary = async () => {
    return this.repo.getSummary();
  };
}
