import { Request } from "express";
import { ActivityLog } from "@/models/activity-log.model";
import { ErrorLog } from "@/models/error-log.model";
import { PaymentLog } from "@/models/payment-log.model";
import logger from "@/configs/logger";

/**
 * Helper: Trích xuất context từ request.
 */
function extractContext(req: Request) {
  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "unknown";

  return {
    tenant_id: req.user?.tenantId || req.tenant?.id || "unknown",
    tenant_slug: req.tenant?.slug || "unknown",
    user_id: req.user?.sub || "anonymous",
    user_type: (req.user?.userType || "CUSTOMER") as "USER" | "CUSTOMER" | "ADMIN",
    ip_address: ip,
    user_agent: req.headers["user-agent"] || "",
  };
}

/** Mask sensitive fields trước khi ghi log */
function maskBody(body: any): Record<string, any> {
  if (!body || typeof body !== "object") return {};
  const masked = { ...body };
  for (const key of ["password", "oldPassword", "newPassword", "token", "secret"]) {
    if (masked[key]) masked[key] = "***";
  }
  return masked;
}

export class LogService {
  /**
   * Activity Log — CHỈ ghi các action quan trọng:
   * LOGIN, REGISTER, CREATE_ORDER, CHECKOUT, PAYMENT, UPDATE_ORDER_STATUS
   */
  static async activity(
    req: Request,
    action: string,
    target: string,
    targetId?: string,
    details?: Record<string, any>,
  ) {
    try {
      const ctx = extractContext(req);
      await ActivityLog.create({
        ...ctx,
        action,
        target,
        target_id: targetId,
        details,
      });
    } catch (err) {
      logger.error("[LogService.activity] failed:", err);
    }
  }

  /**
   * Error Log — Ghi vào MongoDB khi có lỗi (kèm stack trace).
   */
  static async error(req: Request, err: Error, statusCode: number, level: "ERROR" | "WARN" = "ERROR") {
    try {
      const ctx = extractContext(req);
      await ErrorLog.create({
        ...ctx,
        level,
        message: err.message,
        stack_trace: err.stack || "",
        endpoint: req.originalUrl || req.path,
        method: req.method,
        status_code: statusCode,
        request_body: maskBody(req.body),
      });
    } catch (logErr) {
      logger.error("[LogService.error] failed:", logErr);
    }
  }

  /**
   * Payment Log — Ghi raw VNPay request/response để đối soát.
   */
  static async payment(data: {
    tenant_id: string;
    tenant_slug: string;
    order_id: string;
    customer_id?: string;
    gateway: "VNPAY";
    action: "CREATE_URL" | "IPN" | "RETURN";
    raw_request?: Record<string, any>;
    raw_response?: Record<string, any>;
    status: "SUCCESS" | "FAILED" | "PENDING";
    amount?: number;
  }) {
    try {
      await PaymentLog.create(data);
    } catch (err) {
      logger.error("[LogService.payment] failed:", err);
    }
  }
}
