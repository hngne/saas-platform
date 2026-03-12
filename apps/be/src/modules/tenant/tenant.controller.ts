import { Request, Response } from "express";
import { TenantService } from "./tenant.service";
import { APIResponse } from "@/shared/utils/response.util";

const service = new TenantService();

export class TenantController {
  getAll = async (req: Request, res: Response): Promise<void> => {
    const result = await service.getAll(req.query as any);
    res
      .status(200)
      .json(APIResponse.OK("Lấy danh sách tenant thành công", result));
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const result = await service.getById(req.params.id as string);
    res
      .status(200)
      .json(APIResponse.OK("Lấy chi tiết tenant thành công", result));
  };

  banTenant = async (req: Request, res: Response): Promise<void> => {
    const result = await service.banTenant(req.params.id as string);
    res.status(200).json(APIResponse.OK("Khóa tenant thành công", result));
  };

  unbanTenant = async (req: Request, res: Response): Promise<void> => {
    const result = await service.unbanTenant(req.params.id as string);
    res.status(200).json(APIResponse.OK("Mở khóa tenant thành công", result));
  };
}
