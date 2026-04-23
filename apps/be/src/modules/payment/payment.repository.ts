import { PrismaClient as RetailClient } from "../../../generated/retail-client";
import { randomUUID } from "crypto";

export class PaymentRepository {
  constructor(private db: RetailClient) {}

  findOrderWithPayment = async (orderId: string) => {
    return this.db.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });
  };

  upsertPendingPayment = async (data: {
    id: string;
    order_id: string;
    method: string;
    amount: any;
  }) => {
    return this.db.$transaction(async (tx) => {
      const payment = await tx.payment.upsert({
        where: { order_id: data.order_id },
        create: {
          id: data.id,
          order_id: data.order_id,
          method: data.method,
          status: "PENDING",
          amount: data.amount,
        },
        update: {
          method: data.method,
          status: "PENDING",
          amount: data.amount,
        },
      });

      await tx.order.updateMany({
        where: {
          id: data.order_id,
          payment_status: { not: "PAID" },
          order_status: { not: "CANCELLED" },
        },
        data: { payment_status: "PENDING" },
      });

      return payment;
    });
  };

  findPaymentByOrderId = async (orderId: string) => {
    return this.db.payment.findUnique({
      where: { order_id: orderId },
      include: { order: true },
    });
  };

  markPaymentPaidTx = async (
    orderId: string,
    transactionId: string | null,
    vnpayResponse: string,
  ) => {
    return this.db.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: { order_status: true },
      });

      if (!order) {
        return { alreadyPaid: false, cancelled: true };
      }

      if (order?.order_status === "CANCELLED") {
        return { alreadyPaid: false, cancelled: true };
      }

      const payment = await tx.payment.updateMany({
        where: {
          order_id: orderId,
          status: { not: "PAID" },
        },
        data: {
          status: "PAID",
          transaction_id: transactionId,
          vnpay_response: vnpayResponse,
          paid_at: new Date(),
        },
      });

      if (payment.count === 0) {
        return { alreadyPaid: true, cancelled: false };
      }

      await tx.order.update({
        where: { id: orderId },
        data: {
          payment_status: "PAID",
          order_status: order.order_status === "PENDING" ? "PROCESSING" : order.order_status,
        },
      });

      return { alreadyPaid: false, cancelled: false };
    });
  };

  markPaymentFailedTx = async (orderId: string, vnpayResponse: string) => {
    return this.db.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: { order_status: true, payment_status: true },
      });

      if (!order || order.order_status === "CANCELLED" || order.payment_status === "PAID") {
        return { updated: false };
      }

      const payment = await tx.payment.updateMany({
        where: {
          order_id: orderId,
          status: { in: ["PENDING", "FAILED"] },
        },
        data: {
          status: "FAILED",
          vnpay_response: vnpayResponse,
        },
      });

      if (payment.count === 0) {
        return { updated: false };
      }

      await tx.order.update({
        where: { id: orderId },
        data: { payment_status: "FAILED" },
      });

      return { updated: true };
    });
  };

  expireUnpaidOrderTx = async (orderId: string, expiredBefore: Date) => {
    return this.db.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          items: { include: { variant: true } },
        },
      });

      if (
        !order ||
        order.payment_method !== "VNPAY" ||
        order.order_status === "CANCELLED" ||
        order.payment_status === "PAID" ||
        order.created_at > expiredBefore
      ) {
        return { expired: false };
      }

      const claimed = await tx.order.updateMany({
        where: {
          id: orderId,
          payment_method: "VNPAY",
          payment_status: { in: ["PENDING", "FAILED"] },
          order_status: { not: "CANCELLED" },
          created_at: { lte: expiredBefore },
          deleted_at: null,
        },
        data: {
          order_status: "CANCELLED",
          payment_status: "EXPIRED",
        },
      });

      if (claimed.count === 0) return { expired: false };

      for (const item of order.items) {
        const beforeStock = item.variant.stock;
        const afterStock = beforeStock + item.quantity;

        await tx.productVariant.update({
          where: { id: item.variant_id },
          data: { stock: { increment: item.quantity } },
        });

        await tx.inventoryLog.create({
          data: {
            variant_id: item.variant_id,
            user_id: null,
            type: "RETURN",
            quantity: item.quantity,
            before_stock: beforeStock,
            after_stock: afterStock,
            reference_id: orderId,
            reference_type: "RETURN",
            note: `Auto return stock for expired VNPay order #${orderId}`,
          },
        });
      }

      if (order.voucher_id) {
        await tx.voucher.updateMany({
          where: { id: order.voucher_id, used_count: { gt: 0 } },
          data: { used_count: { decrement: 1 } },
        });
      }

      await tx.payment.upsert({
        where: { order_id: orderId },
        create: {
          id: randomUUID(),
          order_id: orderId,
          method: "VNPAY",
          status: "EXPIRED",
          amount: order.total,
        },
        update: {
          status: "EXPIRED",
        },
      });

      return { expired: true };
    });
  };
}
