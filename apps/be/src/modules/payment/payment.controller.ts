import { NextFunction, Request, Response } from "express";
import { URL } from "url";
import { BadRequestException } from "@/shared/exceptions";
import { PaymentService } from "./payment.service";
import { CreatePaymentUrlDto } from "./payment.validator";
import { env } from "@/configs/env";

const service = new PaymentService();

const buildStorefrontUrl = (tenantSlug: string) => {
  const baseUrl = new URL(env.STORE_FRONTEND_URL);
  const hostname = baseUrl.hostname;

  if (tenantSlug && (hostname === "localhost" || hostname === "127.0.0.1")) {
    baseUrl.hostname = `${tenantSlug}.localhost`;
  } else if (
    tenantSlug &&
    hostname.endsWith(".localhost") &&
    !hostname.startsWith(`${tenantSlug}.`)
  ) {
    baseUrl.hostname = `${tenantSlug}.${hostname.split(".").slice(-1)[0] === "localhost" ? "localhost" : hostname}`;
  }

  return baseUrl.toString().replace(/\/$/, "");
};

export class PaymentController {
  createPaymentUrl = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const tenant = req.tenant;
      if (!tenant) {
        throw new BadRequestException("Không xác định được cửa hàng");
      }

      const dto = CreatePaymentUrlDto.parse(req.body);
      const ipAddr =
        (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
        req.socket.remoteAddress ||
        "127.0.0.1";

      const paymentUrl = await service.createPaymentUrl(
        dto,
        tenant.slug,
        tenant.db_name,
        ipAddr,
      );

      res.json({
        success: true,
        data: { paymentUrl },
      });
    } catch (error) {
      next(error);
    }
  };

  vnpayIpn = async (req: Request, res: Response) => {
    const result = await service.handleIpn(req.query as Record<string, string>);
    res.status(200).json(result);
  };

  vnpayReturn = async (req: Request, res: Response) => {
    const result = await service.handleReturn(req.query as Record<string, string>);
    const storefrontUrl = buildStorefrontUrl(result.tenantSlug);
    const redirectUrl =
      `${storefrontUrl}/payment/result` +
      `?code=${encodeURIComponent(result.responseCode)}` +
      `&valid=${result.isValid}` +
      `&ref=${encodeURIComponent(result.txnRef)}` +
      `&order_id=${encodeURIComponent(result.orderId)}` +
      `&method=VNPAY`;

    res.redirect(redirectUrl);
  };
}
