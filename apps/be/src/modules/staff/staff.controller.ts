import { Request, Response } from "express";
import { getTenantDB } from "@/configs/tenant-db";
import { APIResponse } from "@/shared/utils/response.util";
import { StaffService } from "./staff.service";
import { staffFilterSchema } from "./staff.validator";

export class StaffController {
  private getService(req: Request) {
    const db = getTenantDB(req.user!.dbName!);
    return new StaffService(db);
  }

  getAll = async (req: Request, res: Response) => {
    const filter = staffFilterSchema.parse(req.query);
    const data = await this.getService(req).getAll(filter);
    res
      .status(200)
      .json(APIResponse.OK("Lấy danh sách nhân viên thành công", data));
  };

  getSummary = async (req: Request, res: Response) => {
    const data = await this.getService(req).getSummary();
    res
      .status(200)
      .json(APIResponse.OK("Lấy tổng quan nhân viên thành công", data));
  };

  getById = async (req: Request, res: Response) => {
    const data = await this.getService(req).getById(req.params.id as string);
    res.status(200).json(APIResponse.OK("Lấy nhân viên thành công", data));
  };

  create = async (req: Request, res: Response) => {
    const data = await this.getService(req).create(req.body);
    res.status(201).json(APIResponse.Created("Tạo nhân viên thành công", data));
  };

  update = async (req: Request, res: Response) => {
    const data = await this.getService(req).update(
      req.params.id as string,
      req.body,
      req.user!.sub,
    );
    res.status(200).json(APIResponse.OK("Cập nhật nhân viên thành công", data));
  };

  updateStatus = async (req: Request, res: Response) => {
    const data = await this.getService(req).updateStatus(
      req.params.id as string,
      req.body.status,
      req.user!.sub,
    );
    res
      .status(200)
      .json(APIResponse.OK("Cập nhật trạng thái nhân viên thành công", data));
  };

  delete = async (req: Request, res: Response) => {
    await this.getService(req).delete(req.params.id as string, req.user!.sub);
    res.status(200).json(APIResponse.OK("Xóa nhân viên thành công"));
  };
}
