import { PrismaClient as RetailClient } from "../../../generated/retail-client";
import { OrderStatus } from "./order.validator";
import { randomUUID } from "crypto";

export class OrderStorefrontRepository {
  constructor(private db: RetailClient) {}

  /** Lấy giỏ hàng + thông tin variant/product để tính giá */
  async getCartWithVariants(customerId: string) {
    return this.db.cart.findUnique({
      where: { customer_id: customerId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  select: { id: true, name: true, is_active: true, base_price: true },
                },
              },
            },
          },
        },
      },
    });
  }

  /** Lấy shipping method */
  async findShippingMethod(id: string) {
    return this.db.shippingMethod.findUnique({ where: { id } });
  }

  /** Lấy voucher theo code */
  async findVoucherByCode(code: string) {
    return this.db.voucher.findUnique({ where: { code } });
  }

  /** Tạo đơn hàng trong transaction (trừ kho an toàn) */
  async createOrder(params: {
    customerId: string;
    receiverName: string;
    receiverPhone: string;
    shippingAddress: string;
    shippingMethodId?: string;
    pickupStoreId?: string;
    voucherId?: string;
    voucherUsageLimit?: number | null;
    subtotal: number;
    shippingFee: number;
    discount: number;
    total: number;
    paymentMethod: string;
    note?: string;
    items: { variantId: string; quantity: number; unitPrice: number }[];
    cartId: string;
  }) {
    return this.db.$transaction(async (tx) => {
      // 1. Claim cart trước để chống double-submit cùng một giỏ hàng.
      const claimedCart = await tx.cartItem.deleteMany({ where: { cart_id: params.cartId } });
      if (claimedCart.count !== params.items.length) {
        throw new Error("Giỏ hàng đã được xử lý, vui lòng tải lại trang");
      }

      // 2. Trừ tồn kho (Optimistic Locking — stock >= quantity)
      for (const item of params.items) {
        const result = await tx.productVariant.updateMany({
          where: {
            id: item.variantId,
            stock: { gte: item.quantity }, // CHỈ trừ nếu đủ hàng
          },
          data: {
            stock: { decrement: item.quantity },
          },
        });

        if (result.count === 0) {
          throw new Error(`Sản phẩm đã hết hàng hoặc không đủ số lượng`);
        }
      }

      // 3. Tạo Order
      const order = await tx.order.create({
        data: {
          customer_id: params.customerId,
          receiver_name: params.receiverName,
          receiver_phone: params.receiverPhone,
          shipping_address: params.shippingAddress,
          shipping_method_id: params.shippingMethodId,
          pickup_store_id: params.pickupStoreId,
          voucher_id: params.voucherId,
          subtotal: params.subtotal,
          shipping_fee: params.shippingFee,
          discount: params.discount,
          total: params.total,
          payment_method: params.paymentMethod,
          payment_status: "PENDING",
          order_status: "PENDING",
          note: params.note,
          items: {
            create: params.items.map((i) => ({
              variant_id: i.variantId,
              quantity: i.quantity,
              unit_price: i.unitPrice,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      // 4. Tăng used_count cho voucher nếu có (CHOCK CHỐNG RACE CONDITION)
      if (params.voucherId) {
        const vFilter: any = { id: params.voucherId };
        if (params.voucherUsageLimit) {
          vFilter.used_count = { lt: params.voucherUsageLimit };
        }

        const vResult = await tx.voucher.updateMany({
          where: vFilter,
          data: { used_count: { increment: 1 } },
        });

        if (vResult.count === 0) {
          throw new Error("Mã giảm giá đã hết lượt sử dụng");
        }
      }

      return order;
    });
  }

  async findOrderByIdForCustomer(orderId: string, customerId: string) {
    return this.db.order.findFirst({
      where: {
        id: orderId,
        customer_id: customerId,
        deleted_at: null,
      },
      include: {
        items: true,
      },
    });
  }

  async updateOrderStatus(orderId: string, orderStatus: OrderStatus) {
    return this.db.order.update({
      where: { id: orderId },
      data: { order_status: orderStatus },
      include: {
        items: true,
      },
    });
  }

  async markReceived(orderId: string) {
    return this.db.$transaction(async (tx) => {
      const current = await tx.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          order_status: true,
          payment_method: true,
          payment_status: true,
          total: true,
        },
      });

      if (!current) return null;

      const shouldMarkPaid =
        current.payment_method === "COD" && current.payment_status !== "PAID";

      const order = await tx.order.update({
        where: { id: orderId },
        data: {
          order_status: current.order_status === "COMPLETED" ? "COMPLETED" : "DELIVERED",
          ...(shouldMarkPaid ? { payment_status: "PAID" } : {}),
        },
        include: {
          items: true,
        },
      });

      if (shouldMarkPaid) {
        await tx.payment.upsert({
          where: { order_id: orderId },
          create: {
            id: randomUUID(),
            order_id: orderId,
            method: "COD",
            status: "PAID",
            amount: current.total,
            paid_at: new Date(),
          },
          update: {
            status: "PAID",
            paid_at: new Date(),
          },
        });
      }

      return order;
    });
  }
}
