import crypto from "crypto";
import qs from "qs";
import prisma from "@/configs/database";
import logger from "@/configs/logger";
import { getTenantDB } from "@/configs/tenant-db";
import { vnpayConfig } from "@/configs/vnpay";
import { NotificationService } from "@/modules/notification/notification.service";
import { BadRequestException, NotFoundException } from "@/shared/exceptions";
import { PaymentRepository } from "./payment.repository";
import { CreatePaymentUrlDto } from "./payment.validator";

function sortObject(obj: Record<string, string>): Record<string, string> {
  const sorted: Record<string, string> = {};
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = encodeURIComponent(obj[key]).replace(/%20/g, "+");
  }
  return sorted;
}

function formatVnpDate(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

function buildTxnRef(tenantSlug: string, orderId: string): string {
  return `${tenantSlug}.${orderId.replace(/-/g, "")}`;
}

function parseTxnRef(txnRef: string): { tenantSlug: string; orderId: string } {
  const dotIndex = txnRef.indexOf(".");
  if (dotIndex === -1) throw new BadRequestException("TxnRef không hợp lệ");

  const tenantSlug = txnRef.substring(0, dotIndex);
  const rawId = txnRef.substring(dotIndex + 1);
  const orderId = [
    rawId.substring(0, 8),
    rawId.substring(8, 12),
    rawId.substring(12, 16),
    rawId.substring(16, 20),
    rawId.substring(20),
  ].join("-");

  return { tenantSlug, orderId };
}

function hmacSha512(secret: string, data: string): string {
  return crypto
    .createHmac("sha512", secret)
    .update(Buffer.from(data, "utf-8"))
    .digest("hex");
}

function verifySignature(
  query: Record<string, string>,
  secretKey: string,
): { isValid: boolean; params: Record<string, string> } {
  const secureHash = query["vnp_SecureHash"];
  const params = { ...query };
  delete params["vnp_SecureHash"];
  delete params["vnp_SecureHashType"];

  const sorted = sortObject(params);
  const signData = qs.stringify(sorted, { encode: false });
  const signed = hmacSha512(secretKey, signData);

  return { isValid: secureHash === signed, params };
}

type PaymentContext = {
  tenant: Awaited<ReturnType<typeof prisma.tenant.findUnique>>;
  tenantDB: ReturnType<typeof getTenantDB>;
  repo: PaymentRepository;
  orderId: string;
};

type ReturnResult = {
  isValid: boolean;
  responseCode: string;
  txnRef: string;
  tenantSlug: string;
  orderId: string;
};

export class PaymentService {
  createPaymentUrl = async (
    dto: CreatePaymentUrlDto,
    tenantSlug: string,
    dbName: string,
    ipAddr: string,
  ): Promise<string> => {
    if (!vnpayConfig.isConfigured) {
      throw new BadRequestException("Cấu hình VNPay chưa được thiết lập trên hệ thống");
    }

    const tenantDB = getTenantDB(dbName);
    const repo = new PaymentRepository(tenantDB);
    const order = await repo.findOrderWithPayment(dto.order_id);

    if (!order) throw new NotFoundException("Đơn hàng không tồn tại");
    if (order.order_status === "CANCELLED") {
      throw new BadRequestException("Đơn hàng đã hủy, không thể thanh toán");
    }
    if (order.payment_method !== "VNPAY") {
      throw new BadRequestException("Đơn hàng này không sử dụng phương thức VNPay");
    }
    if (order.payment_status === "PAID" || order.payment?.status === "PAID") {
      throw new BadRequestException("Đơn hàng đã được thanh toán");
    }

    const expiredBefore = new Date(Date.now() - 60 * 60 * 1000);
    if (order.created_at <= expiredBefore) {
      await repo.expireUnpaidOrderTx(order.id, expiredBefore);
      throw new BadRequestException(
        "Đơn hàng đã quá hạn thanh toán 60 phút và đã được hủy",
      );
    }

    await repo.upsertPendingPayment({
      id: crypto.randomUUID(),
      order_id: order.id,
      method: "VNPAY",
      amount: order.total,
    });

    const now = new Date();
    const expireDate = new Date(now.getTime() + 15 * 60 * 1000);
    const vnpParams: Record<string, string> = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode: vnpayConfig.tmnCode,
      vnp_Locale: dto.language ?? "vn",
      vnp_CurrCode: "VND",
      vnp_TxnRef: buildTxnRef(tenantSlug, order.id),
      vnp_OrderInfo: `Thanh toan don hang ${order.id}`,
      vnp_OrderType: "other",
      vnp_Amount: (Number(order.total) * 100).toString(),
      vnp_ReturnUrl: vnpayConfig.returnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: formatVnpDate(now),
      vnp_ExpireDate: formatVnpDate(expireDate),
    };

    if (dto.bank_code) {
      vnpParams["vnp_BankCode"] = dto.bank_code;
    }

    const sorted = sortObject(vnpParams);
    const signData = qs.stringify(sorted, { encode: false });
    const secureHash = hmacSha512(vnpayConfig.hashSecret, signData);
    sorted["vnp_SecureHash"] = secureHash;

    logger.info(`[Payment] VNPay URL created for order ${order.id}`);
    return `${vnpayConfig.url}?${qs.stringify(sorted, { encode: false })}`;
  };

  handleIpn = async (
    query: Record<string, string>,
  ): Promise<{ RspCode: string; Message: string }> => {
    if (!vnpayConfig.isConfigured) return { RspCode: "99", Message: "Missing config" };

    try {
      const { isValid, params } = verifySignature(query, vnpayConfig.hashSecret);
      if (!isValid) {
        logger.warn("[Payment IPN] Invalid signature");
        return { RspCode: "97", Message: "Invalid signature" };
      }

      const context = await this.resolvePaymentContext(params["vnp_TxnRef"]);
      if (!context) {
        return { RspCode: "01", Message: "Order not found" };
      }

      const amountValid = await this.verifyAmount(context, params["vnp_Amount"]);
      if (!amountValid) {
        return { RspCode: "04", Message: "Invalid amount" };
      }

      await this.syncPaymentResult(context, params, "IPN");
      return { RspCode: "00", Message: "Confirm Success" };
    } catch (error: any) {
      logger.error(`[Payment IPN] Error: ${error.message}`);
      return { RspCode: "99", Message: "Unknown error" };
    }
  };

  handleReturn = async (query: Record<string, string>): Promise<ReturnResult> => {
    if (!vnpayConfig.isConfigured) {
      return {
        isValid: false,
        responseCode: "99",
        txnRef: "",
        tenantSlug: "",
        orderId: "",
      };
    }

    const { isValid, params } = verifySignature(query, vnpayConfig.hashSecret);
    const responseCode = params["vnp_ResponseCode"] || "99";
    const txnRef = params["vnp_TxnRef"] || "";

    let tenantSlug = "";
    let orderId = "";

    if (txnRef) {
      try {
        const parsed = parseTxnRef(txnRef);
        tenantSlug = parsed.tenantSlug;
        orderId = parsed.orderId;
      } catch {
        tenantSlug = "";
        orderId = "";
      }
    }

    if (isValid && txnRef) {
      const context = await this.resolvePaymentContext(txnRef).catch(() => null);
      if (context) {
        const amountValid = await this.verifyAmount(context, params["vnp_Amount"]);
        if (amountValid) {
          await this.syncPaymentResult(context, params, "RETURN").catch((error) => {
            logger.error(`[Payment RETURN] Sync failed for ${context.orderId}: ${error.message}`);
          });
        }
      }
    }

    return {
      isValid,
      responseCode,
      txnRef,
      tenantSlug,
      orderId,
    };
  };

  private async resolvePaymentContext(txnRef: string): Promise<PaymentContext | null> {
    const { tenantSlug, orderId } = parseTxnRef(txnRef);
    const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });

    if (!tenant) {
      logger.warn(`[Payment] Tenant not found: ${tenantSlug}`);
      return null;
    }

    const tenantDB = getTenantDB(tenant.db_name);
    const repo = new PaymentRepository(tenantDB);
    const payment = await repo.findPaymentByOrderId(orderId);

    if (!payment) {
      logger.warn(`[Payment] Payment not found for order: ${orderId}`);
      return null;
    }

    return { tenant, tenantDB, repo, orderId };
  }

  private async verifyAmount(context: PaymentContext, amountRaw?: string) {
    const payment = await context.repo.findPaymentByOrderId(context.orderId);
    if (!payment) return false;

    const vnpAmount = Number(amountRaw || 0);
    const expectedAmount = Math.round(Number(payment.amount) * 100);

    if (vnpAmount !== expectedAmount) {
      logger.warn(
        `[Payment] Amount mismatch for order ${context.orderId}: vnp=${vnpAmount}, expected=${expectedAmount}`,
      );
      return false;
    }

    return true;
  }

  private async syncPaymentResult(
    context: PaymentContext,
    params: Record<string, string>,
    source: "IPN" | "RETURN",
  ) {
    const responseCode = params["vnp_ResponseCode"];
    const transactionStatus = params["vnp_TransactionStatus"];
    const payload = JSON.stringify(params);

    if (responseCode === "00" && (!transactionStatus || transactionStatus === "00")) {
      const result = await context.repo.markPaymentPaidTx(
        context.orderId,
        params["vnp_TransactionNo"] || null,
        payload,
      );

      if (result.alreadyPaid) {
        logger.info(`[Payment ${source}] Already confirmed: ${context.orderId}`);
        return;
      }

      if (result.cancelled) {
        logger.warn(`[Payment ${source}] Ignored paid callback for cancelled order: ${context.orderId}`);
        return;
      }

      logger.info(`[Payment ${source}] SUCCESS - Order: ${context.orderId}`);
      await this.notifyPaymentSuccess(context);
      return;
    }

    const failResult = await context.repo.markPaymentFailedTx(context.orderId, payload);
    if (failResult?.updated) {
      logger.info(`[Payment ${source}] FAILED - Order: ${context.orderId}, Code: ${responseCode}`);
      await this.notifyPaymentFailed(context);
    }
  }

  private async notifyPaymentSuccess(context: PaymentContext) {
    const notiService = new NotificationService(context.tenantDB);
    const order = await context.tenantDB.order.findUnique({
      where: { id: context.orderId },
      select: { customer_id: true, total: true },
    });

    if (!order) return;

    notiService.create(context.tenant!.id, {
      userId: order.customer_id,
      userType: "CUSTOMER",
      title: "Thanh toán thành công",
      body: `Đơn hàng #${context.orderId.slice(-8).toUpperCase()} đã thanh toán ${order.total}đ qua VNPay.`,
      type: "PAYMENT",
    });

    notiService.notifyMerchants(
      context.tenant!.id,
      "Thanh toán VNPay",
      `Đơn #${context.orderId.slice(-8).toUpperCase()} đã thanh toán thành công.`,
      "PAYMENT",
    );
  }

  private async notifyPaymentFailed(context: PaymentContext) {
    const notiService = new NotificationService(context.tenantDB);
    const order = await context.tenantDB.order.findUnique({
      where: { id: context.orderId },
      select: { customer_id: true },
    });

    if (!order) return;

    notiService.create(context.tenant!.id, {
      userId: order.customer_id,
      userType: "CUSTOMER",
      title: "Thanh toán chưa hoàn tất",
      body: `Đơn hàng #${context.orderId.slice(-8).toUpperCase()} chưa được thanh toán. Bạn có thể thử lại.`,
      type: "PAYMENT",
    });
  }
}
