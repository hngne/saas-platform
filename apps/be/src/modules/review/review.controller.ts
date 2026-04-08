import { Request, Response } from "express";
import { ReviewService } from "./review.service";
import { getTenantDB } from "@/configs/tenant-db";
import { APIResponse } from "@/shared/utils/response.util";

export class ReviewController {
  private getService(req: Request) {
    const dbName = req.user!.dbName!;
    const db = getTenantDB(dbName);
    return new ReviewService(db);
  }

  getAll = async (req: Request, res: Response) => {
    // Ép kiểu trực tiếp từ query vì validator.ts đôi lúc trả chuỗi đối với URLSearchParams
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const rating = req.query.rating ? Number(req.query.rating) : undefined;
    
    let is_visible: boolean | undefined = undefined;
    if (req.query.is_visible !== undefined) {
      is_visible = String(req.query.is_visible) === "true";
    }

    const data = await this.getService(req).getAll({
      product_id: req.query.product_id as string | undefined,
      customer_id: req.query.customer_id as string | undefined,
      rating,
      is_visible,
      page,
      limit,
    });
    
    res.status(200).json(APIResponse.OK("Lấy danh sách đánh giá thành công", data));
  };

  getById = async (req: Request, res: Response) => {
    const data = await this.getService(req).getById(req.params.id as string);
    res.status(200).json(APIResponse.OK("Lấy chi tiết đánh giá thành công", data));
  };

  toggleVisible = async (req: Request, res: Response) => {
    const { is_visible } = req.body;
    if (typeof is_visible !== "boolean") {
      res.status(400).json(APIResponse.BadRequest("is_visible phải là boolean"));
      return;
    }
    const data = await this.getService(req).toggleVisible(
      req.params.id as string,
      is_visible,
    );
    res
      .status(200)
      .json(APIResponse.OK("Cập nhật trạng thái hiển thị thành công", data));
  };

  delete = async (req: Request, res: Response) => {
    await this.getService(req).delete(req.params.id as string);
    res.status(200).json(APIResponse.OK("Xóa đánh giá thành công"));
  };
}
