import { PrismaClient as RetailClient } from "../../../generated/retail-client";
import { BadRequestException, NotFoundException } from "@/shared/exceptions";
import { OrderStorefrontRepository } from "./order-storefront.repository";
import { CheckoutDto, ValidateVoucherDto } from "./order-storefront.validator";

export class OrderStorefrontService {
  private repo: OrderStorefrontRepository;

  constructor(db: RetailClient) {
    this.repo = new OrderStorefrontRepository(db);
  }

  private calculateVoucherDiscount = async (code: string, subtotal: number) => {
    const normalizedCode = code.trim().toUpperCase();
    const voucher = await this.repo.findVoucherByCode(normalizedCode);
    if (!voucher) throw new NotFoundException("Mã giảm giá không tồn tại");
    if (!voucher.is_active) throw new BadRequestException("Mã giảm giá đã hết hiệu lực");
    if (voucher.usage_limit && voucher.used_count >= voucher.usage_limit) {
      throw new BadRequestException("Mã giảm giá đã hết lượt sử dụng");
    }
    if (voucher.start_date && new Date() < voucher.start_date) {
      throw new BadRequestException("Mã giảm giá chưa đến ngày áp dụng");
    }
    if (voucher.end_date && new Date() > voucher.end_date) {
      throw new BadRequestException("Mã giảm giá đã hết hạn");
    }
    if (voucher.min_order_value && subtotal < Number(voucher.min_order_value)) {
      throw new BadRequestException(
        `Đơn hàng tối thiểu ${Number(voucher.min_order_value).toLocaleString("vi-VN")}đ để dùng mã này`,
      );
    }

    let discount = 0;
    if (voucher.discount_type === "PERCENT") {
      discount = (subtotal * Number(voucher.discount_value)) / 100;
      if (voucher.max_discount) {
        discount = Math.min(discount, Number(voucher.max_discount));
      }
    } else {
      discount = Number(voucher.discount_value);
    }

    return {
      voucher,
      code: voucher.code,
      discount: Math.min(discount, subtotal),
    };
  };

  validateVoucher = async (dto: ValidateVoucherDto) => {
    const result = await this.calculateVoucherDiscount(dto.code, dto.subtotal);
    const total = Math.max(dto.subtotal + (dto.shipping_fee || 0) - result.discount, 0);

    return {
      valid: true,
      code: result.code,
      discount: result.discount,
      subtotal: dto.subtotal,
      shipping_fee: dto.shipping_fee || 0,
      total,
      voucher: {
        id: result.voucher.id,
        code: result.voucher.code,
        name: result.voucher.name,
        discount_type: result.voucher.discount_type,
        discount_value: result.voucher.discount_value,
        max_discount: result.voucher.max_discount,
        min_order_value: result.voucher.min_order_value,
      },
    };
  };

  /**
   * Tạo đơn hàng từ giỏ hàng
   * 1. Validate giỏ hàng
   * 2. Tính giá (subtotal, shipping, discount, total)
   * 3. Tạo Order trong Transaction (trừ kho an toàn)
   */
  checkout = async (customerId: string, dto: CheckoutDto) => {
    // 1. Lấy giỏ hàng
    const cart = await this.repo.getCartWithVariants(customerId);
    if (!cart || cart.items.length === 0) {
      throw new BadRequestException("Giỏ hàng trống");
    }

    // 2. Validate từng item trong giỏ
    const orderItems: { variantId: string; quantity: number; unitPrice: number }[] = [];
    let subtotal = 0;

    for (const item of cart.items) {
      const variant = item.variant;
      if (!variant || !variant.product.is_active || !variant.is_active) {
        throw new BadRequestException(
          `Sản phẩm "${variant?.product?.name || "unknown"}" đã ngừng bán`,
        );
      }
      if (variant.stock < item.quantity) {
        throw new BadRequestException(
          `"${variant.product.name}" chỉ còn ${variant.stock} sản phẩm`,
        );
      }

      let unitPrice = Number(variant.price ?? variant.product.base_price);
      
      // Áp dụng khuyến mãi nếu có
      const activePromo = (variant.product as any).promotion_details?.[0];
      if (activePromo) {
        unitPrice = unitPrice * (1 - activePromo.discount_percent / 100);
      }

      subtotal += unitPrice * item.quantity;

      orderItems.push({
        variantId: variant.id,
        quantity: item.quantity,
        unitPrice,
      });
    }

    // 3. Tính phí ship
    let shippingFee = 0;
    if (dto.shipping_method_id) {
      const method = await this.repo.findShippingMethod(dto.shipping_method_id);
      if (!method) throw new NotFoundException("Phương thức vận chuyển không tồn tại");
      if (!method.is_active) throw new BadRequestException("Phương thức vận chuyển đã tắt");
      shippingFee = Number(method.fee);
    }

    // 4. Tính giảm giá (Voucher)
    let discount = 0;
    let voucherId: string | undefined;
    if (dto.voucher_code) {
      const voucherResult = await this.calculateVoucherDiscount(dto.voucher_code, subtotal);
      discount = voucherResult.discount;
      voucherId = voucherResult.voucher.id;
    }

    // 5. Tổng tiền
    const total = Math.max(subtotal + shippingFee - discount, 0);

    // 6. Tạo Order (Transaction an toàn — trừ kho + tạo order + xóa cart)
    const order = await this.repo.createOrder({
      customerId,
      receiverName: dto.receiver_name,
      receiverPhone: dto.receiver_phone,
      shippingAddress: dto.shipping_address,
      shippingMethodId: dto.shipping_method_id,
      pickupStoreId: dto.pickup_store_id,
      voucherId,
      voucherUsageLimit: voucherId ? await this.repo.findVoucherByCode(dto.voucher_code as string).then(v => v?.usage_limit) : undefined, // Truyền limit để guard race condition
      subtotal,
      shippingFee,
      discount,
      total,
      paymentMethod: dto.payment_method,
      note: dto.note,
      items: orderItems,
      cartId: cart.id,
    });

    return order;
  };

  confirmReceived = async (customerId: string, orderId: string) => {
    const order = await this.repo.findOrderByIdForCustomer(orderId, customerId);

    if (!order) {
      throw new NotFoundException("Đơn hàng không tồn tại");
    }

    if (order.order_status === "COMPLETED") {
      return order;
    }

    if (!["SHIPPED", "DELIVERED"].includes(order.order_status)) {
      throw new BadRequestException(
        "Chỉ có thể xác nhận nhận hàng sau khi đơn đang giao hoặc đã giao",
      );
    }

    const updated = await this.repo.markReceived(orderId);
    if (!updated) throw new NotFoundException("Đơn hàng không tồn tại");
    return updated;
  };
}
