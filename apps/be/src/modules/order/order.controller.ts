import { Request, Response } from "express";
import { OrderService } from "./order.service";
import { getTenantDB } from "@/configs/tenant-db";
import { APIResponse } from "@/shared/utils/response.util";
import { BadRequestException } from "@/shared/exceptions";
import { orderFilterSchema, updateOrderStatusSchema } from "./order.validator";

const getParam = (req: Request, key: string): string => {
  const val = req.params[key];
  if (!val || typeof val !== "string") {
    throw new BadRequestException(`Thiếu hoặc sai định dạng param: ${key}`);
  }
  return val;
};

export class OrderController {
  private getService(req: Request) {
    const db = getTenantDB(req.user!.dbName!);
    return new OrderService(db);
  }

  getAll = async (req: Request, res: Response) => {
    const filter = orderFilterSchema.parse(req.query);
    const data = await this.getService(req).getAll(filter);
    res
      .status(200)
      .json(APIResponse.OK("Lấy danh sách đơn hàng thành công", data));
  };

  getById = async (req: Request, res: Response) => {
    const id = getParam(req, "id");
    const data = await this.getService(req).getById(id);
    res
      .status(200)
      .json(APIResponse.OK("Lấy chi tiết đơn hàng thành công", data));
  };

  updateStatus = async (req: Request, res: Response) => {
    const id = getParam(req, "id");
    const dto = updateOrderStatusSchema.parse(req.body);
    const userId = req.user!.sub;
    const data = await this.getService(req).updateStatus(id, dto, userId);
    res
      .status(200)
      .json(APIResponse.OK("Cập nhật trạng thái đơn hàng thành công", data));
  };

  countByStatus = async (req: Request, res: Response) => {
    const data = await this.getService(req).countByStatus();
    res
      .status(200)
      .json(APIResponse.OK("Lấy thống kê đơn hàng thành công", data));
  };
}
