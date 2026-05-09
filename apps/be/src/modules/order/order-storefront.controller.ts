import { Request, Response } from "express";
import { getTenantDB } from "@/configs/tenant-db";
import { APIResponse } from "@/shared/utils/response.util";
import { NotFoundException } from "@/shared/exceptions";
import { buildPaginationMeta } from "@/shared/utils/pagination.util";
import { OrderStorefrontService } from "./order-storefront.service";
import { CheckoutDto, ValidateVoucherDto } from "./order-storefront.validator";
import { LogService } from "@/shared/services/log.service";
import { NotificationService } from "@/modules/notification/notification.service";
import logger from "@/configs/logger";
import { getIO } from "@/configs/socket";

export class OrderStorefrontController {
  private buildOrderDetailInclude() {
    return {
      items: {
        include: {
          variant: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  images: { take: 1, orderBy: { sort_order: "asc" as const } },
                },
              },
              variant_values: {
                include: {
                  attribute_value: { include: { attribute: true } },
                },
              },
            },
          },
        },
      },
      voucher: {
        select: {
          id: true,
          code: true,
          discount_type: true,
          discount_value: true,
        },
      },
      shipping_method: true,
      pickup_store: true,
      payment: true,
    };
  }

  private getService(req: Request) {
    const db = getTenantDB(req.user?.dbName || req.tenant!.db_name);
    return new OrderStorefrontService(db);
  }

  /** Đặt hàng (Checkout) - FE gọi riêng /payment/create_url nếu VNPAY */
  checkout = async (req: Request, res: Response) => {
    const dto = req.body as CheckoutDto;
    const order = await this.getService(req).checkout(req.user!.sub, dto);

    logger.info(
      `POST ${req.originalUrl} - Đặt hàng #${order.id}, tổng: ${order.total}đ, thanh toán: ${dto.payment_method}`,
      {
        tenant: req.user?.tenantId,
        userId: req.user!.sub,
        userType: "CUSTOMER",
      },
    );

    LogService.activity(req, "CREATE_ORDER", "Order", order.id, {
      total: order.total,
      payment_method: dto.payment_method,
      items_count: order.items?.length,
    });

    const db = getTenantDB(req.user!.dbName!);
    const notiService = new NotificationService(db);

    await Promise.allSettled([
      notiService.notifyMerchants(
        req.user!.tenantId!,
        "Đơn hàng mới",
        `Đơn hàng #${order.id.slice(-8).toUpperCase()} - ${order.total}đ (${dto.payment_method})`,
        "ORDER",
      ),
      notiService.create(req.user!.tenantId!, {
        userId: req.user!.sub,
        userType: "CUSTOMER",
        title: "Đặt hàng thành công",
        body: `Đơn hàng #${order.id.slice(-8).toUpperCase()} đã được tiếp nhận. ${
          dto.payment_method === "VNPAY"
            ? "Vui lòng thanh toán qua VNPay."
            : "Chúng tôi sẽ liên hệ sớm."
        }`,
        type: "ORDER",
      }),
      // Emit order:updated để Dashboard load lại
      (async () => {
        try {
          const io = getIO();
          io.to(`tenant:${req.user!.tenantId}:merchants`).emit("order:updated", {
            orderId: order.id,
            status: order.order_status,
          });
        } catch (err) {
          logger.error("[Socket] Emit order:updated failed", err);
        }
      })(),
    ]);

    res.status(201).json(APIResponse.Created("Đặt hàng thành công", { order }));
  };

  validateVoucher = async (req: Request, res: Response) => {
    const dto = req.body as ValidateVoucherDto;
    const result = await this.getService(req).validateVoucher(dto);
    res.status(200).json(APIResponse.OK("Áp dụng mã giảm giá thành công", result));
  };

  /** Lịch sử đơn hàng của customer */
  getMyOrders = async (req: Request, res: Response) => {
    const db = getTenantDB(req.user!.dbName!);
    const customerId = req.user!.sub;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const where = { customer_id: customerId, deleted_at: null };

    const [data, total] = await Promise.all([
      db.order.findMany({
        where,
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: {
                    select: {
                      id: true,
                      name: true,
                      images: { take: 1, orderBy: { sort_order: "asc" as const } },
                    },
                  },
                  variant_values: {
                    include: {
                      attribute_value: { include: { attribute: true } },
                    },
                  },
                },
              },
            },
          },
          payment: true,
          shipping_method: { select: { id: true, name: true, type: true } },
        },
        orderBy: { created_at: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.order.count({ where }),
    ]);

    res.status(200).json(
      APIResponse.OK("Lấy danh sách đơn hàng thành công", {
        data,
        meta: buildPaginationMeta(total, page, limit),
      }),
    );
  };

  /** Chi tiết 1 đơn hàng */
  getMyOrderById = async (req: Request, res: Response) => {
    const db = getTenantDB(req.user!.dbName!);
    const customerId = req.user!.sub;

    const order = await db.order.findFirst({
      where: {
        id: req.params.id as string,
        customer_id: customerId,
        deleted_at: null,
      },
      include: this.buildOrderDetailInclude(),
    });

    if (!order) throw new NotFoundException("Đơn hàng không tồn tại");

    res.status(200).json(APIResponse.OK("Lấy chi tiết đơn hàng thành công", order));
  };

  confirmReceived = async (req: Request, res: Response) => {
    const orderId = String(req.params.id || "");
    if (!orderId) throw new NotFoundException("Đơn hàng không tồn tại");

    const order = await this.getService(req).confirmReceived(req.user!.sub, orderId);
    const db = getTenantDB(req.user!.dbName!);
    const notiService = new NotificationService(db);
    const orderCode = order.id.slice(-8).toUpperCase();

    await Promise.allSettled([
      notiService.create(req.user!.tenantId!, {
        userId: req.user!.sub,
        userType: "CUSTOMER",
        title: "Đã xác nhận nhận hàng",
        body: `Đơn hàng #${orderCode} đã được ghi nhận là đã giao.`,
        type: "ORDER",
      }),
      notiService.notifyMerchants(
        req.user!.tenantId!,
        "Khách đã xác nhận nhận hàng",
        `Đơn hàng #${orderCode} đã được ghi nhận là đã giao.`,
        "ORDER",
      ),
    ]);

    // Sync UI cho merchant
    try {
      const { getIO } = require("@/configs/socket");
      const io = getIO();
      io.to(`tenant:${req.user!.tenantId!}:merchants`).emit("order:updated", {
        orderId: orderId,
        status: "DELIVERED",
      });
    } catch { /* ignore */ }

    const refreshedOrder = await db.order.findFirst({
      where: {
        id: orderId,
        customer_id: req.user!.sub,
        deleted_at: null,
      },
      include: this.buildOrderDetailInclude(),
    });

    res.status(200).json(
      APIResponse.OK("Xác nhận nhận hàng thành công", refreshedOrder || order),
    );
  };
}
