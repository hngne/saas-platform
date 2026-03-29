import { Request, Response } from "express";
import { ShippingService } from "./shipping.service";
import { getTenantDB } from "@/configs/tenant-db";
import { APIResponse } from "@/shared/utils/response.util";
import { BadRequestException } from "@/shared/exceptions";
import { toggleActiveSchema } from "./shipping.validator";

const getParam = (req: Request, key: string): string => {
  const val = req.params[key];
  if (!val || typeof val !== "string") {
    throw new BadRequestException(`Thiếu hoặc sai định dạng param: ${key}`);
  }
  return val;
};

export class ShippingController {
  private getService(req: Request) {
    const db = getTenantDB(req.user!.dbName!);
    return new ShippingService(db);
  }

  getAll = async (req: Request, res: Response) => {
    const data = await this.getService(req).getAll();
    res
      .status(200)
      .json(
        APIResponse.OK("Lấy danh sách phương thức vận chuyển thành công", data),
      );
  };

  getById = async (req: Request, res: Response) => {
    const id = getParam(req, "id");
    const data = await this.getService(req).getById(id);
    res
      .status(200)
      .json(APIResponse.OK("Lấy phương thức vận chuyển thành công", data));
  };

  create = async (req: Request, res: Response) => {
    const data = await this.getService(req).create(req.body);
    res
      .status(201)
      .json(APIResponse.Created("Tạo phương thức vận chuyển thành công", data));
  };

  update = async (req: Request, res: Response) => {
    const id = getParam(req, "id");
    const data = await this.getService(req).update(id, req.body);
    res
      .status(200)
      .json(APIResponse.OK("Cập nhật phương thức vận chuyển thành công", data));
  };

  delete = async (req: Request, res: Response) => {
    const id = getParam(req, "id");
    await this.getService(req).delete(id);
    res
      .status(200)
      .json(APIResponse.OK("Xóa phương thức vận chuyển thành công"));
  };

  toggleActive = async (req: Request, res: Response) => {
    const id = getParam(req, "id");
    const { is_active } = toggleActiveSchema.parse(req.body);
    await this.getService(req).toggleActive(id, is_active);
    res.status(200).json(APIResponse.OK("Cập nhật trạng thái thành công"));
  };
}
