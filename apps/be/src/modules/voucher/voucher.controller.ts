import { Request, Response } from "express";
import { VoucherService } from "./voucher.service";
import { getTenantDB } from "@/configs/tenant-db";
import { APIResponse } from "@/shared/utils/response.util";
import { BadRequestException } from "@/shared/exceptions";
import { toggleActiveSchema, voucherFilterSchema } from "./voucher.validator";

const getParam = (req: Request, key: string): string => {
  const val = req.params[key];
  if (!val || typeof val !== "string") {
    throw new BadRequestException(`Thiếu hoặc sai định dạng param: ${key}`);
  }
  return val;
};

export class VoucherController {
  private getService(req: Request) {
    const db = getTenantDB(req.user!.dbName!);
    return new VoucherService(db);
  }

  getAll = async (req: Request, res: Response) => {
    const filter = voucherFilterSchema.parse(req.query);
    const data = await this.getService(req).getAll(filter);
    res
      .status(200)
      .json(APIResponse.OK("Lấy danh sách voucher thành công", data));
  };

  getById = async (req: Request, res: Response) => {
    const id = getParam(req, "id");
    const data = await this.getService(req).getById(id);
    res.status(200).json(APIResponse.OK("Lấy voucher thành công", data));
  };

  create = async (req: Request, res: Response) => {
    const data = await this.getService(req).create(req.body);
    res.status(201).json(APIResponse.Created("Tạo voucher thành công", data));
  };

  update = async (req: Request, res: Response) => {
    const id = getParam(req, "id");
    const data = await this.getService(req).update(id, req.body);
    res.status(200).json(APIResponse.OK("Cập nhật voucher thành công", data));
  };

  delete = async (req: Request, res: Response) => {
    const id = getParam(req, "id");
    await this.getService(req).delete(id);
    res.status(200).json(APIResponse.OK("Xóa voucher thành công"));
  };

  toggleActive = async (req: Request, res: Response) => {
    const id = getParam(req, "id");
    const { is_active } = toggleActiveSchema.parse(req.body);
    await this.getService(req).toggleActive(id, is_active);
    res
      .status(200)
      .json(APIResponse.OK("Cập nhật trạng thái voucher thành công"));
  };
}
