import { Request, Response } from "express";
import { getTenantDB } from "@/configs/tenant-db";
import { APIResponse } from "@/shared/utils/response.util";
import { BadRequestException } from "@/shared/exceptions";

export class ReviewStorefrontController {
  /** Lấy danh sách đánh giá của 1 sản phẩm (public) */
  getByProduct = async (req: Request, res: Response) => {
    const db = getTenantDB(req.tenant!.db_name);
    const productId = req.params.productId as string;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const where = { product_id: productId, is_visible: true };

    const [data, total] = await Promise.all([
      db.review.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, avatar_url: true } },
        },
        orderBy: { created_at: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.review.count({ where }),
    ]);

    const avg = await db.review.aggregate({
      where: { product_id: productId, is_visible: true },
      _avg: { rating: true },
    });

    res.status(200).json(
      APIResponse.OK("Lấy đánh giá thành công", {
        data,
        total,
        average_rating: avg._avg?.rating ?? 0,
      }),
    );
  };

  /** Customer tạo đánh giá sau khi đã xác nhận nhận hàng */
  create = async (req: Request, res: Response) => {
    const db = getTenantDB(req.user!.dbName!);
    const customerId = req.user!.sub;
    const { product_id, order_id, rating, comment, images } = req.body;

    const order = await db.order.findFirst({
      where: {
        id: order_id,
        customer_id: customerId,
        order_status: { in: ["DELIVERED", "COMPLETED"] },
        deleted_at: null,
      },
      include: { items: true },
    });

    if (!order) {
      throw new BadRequestException(
        "Bạn chỉ có thể đánh giá sản phẩm trong đơn hàng đã xác nhận nhận hàng",
      );
    }

    const hasProduct = await db.orderItem.findFirst({
      where: {
        order_id: order.id,
        variant: { product_id: product_id },
      },
    });

    if (!hasProduct) {
      throw new BadRequestException("Sản phẩm này không nằm trong đơn hàng");
    }

    const existing = await db.review.findFirst({
      where: { product_id, customer_id: customerId, order_id },
    });

    if (existing) {
      throw new BadRequestException(
        "Bạn đã đánh giá sản phẩm này cho đơn hàng này rồi",
      );
    }

    const review = await db.review.create({
      data: {
        product_id,
        customer_id: customerId,
        order_id,
        rating,
        comment,
        images: images ? JSON.stringify(images) : null,
      },
    });

    res.status(201).json(APIResponse.Created("Đánh giá thành công", review));
  };
}
