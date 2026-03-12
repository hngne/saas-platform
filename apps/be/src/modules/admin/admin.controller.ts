import { Request, Response } from "express";
import { AdminService } from "./admin.service";
import { APIResponse } from "@/shared/utils/response.util";

const service = new AdminService();

export class AdminController {
  getProfile = async (req: Request, res: Response): Promise<void> => {
    const result = await service.getProfile(req.user!.sub);
    res
      .status(200)
      .json(APIResponse.OK("Lấy thông tin admin thành công", result));
  };

  getStats = async (req: Request, res: Response): Promise<void> => {
    const result = await service.getStats();
    res.status(200).json(APIResponse.OK("Lấy thống kê thành công", result));
  };
}
