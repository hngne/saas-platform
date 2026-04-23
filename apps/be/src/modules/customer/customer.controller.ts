import { Request, Response } from "express";
import { getTenantDB } from "@/configs/tenant-db";
import { APIResponse } from "@/shared/utils/response.util";
import { CustomerService } from "./customer.service";
import { customerFilterSchema } from "./customer.validator";

export class CustomerController {
  private getService(req: Request) {
    const db = getTenantDB(req.user!.dbName!);
    return new CustomerService(db);
  }

  getAll = async (req: Request, res: Response) => {
    const filter = customerFilterSchema.parse(req.query);
    const data = await this.getService(req).getAll(filter);
    res
      .status(200)
      .json(APIResponse.OK("Lấy danh sách người dùng thành công", data));
  };

  getSummary = async (req: Request, res: Response) => {
    const data = await this.getService(req).getSummary();
    res
      .status(200)
      .json(APIResponse.OK("Lấy tổng quan người dùng thành công", data));
  };

  getById = async (req: Request, res: Response) => {
    const data = await this.getService(req).getById(req.params.id as string);
    res.status(200).json(APIResponse.OK("Lấy người dùng thành công", data));
  };

  updateStatus = async (req: Request, res: Response) => {
    const data = await this.getService(req).updateStatus(
      req.params.id as string,
      req.body.status,
    );
    res
      .status(200)
      .json(APIResponse.OK("Cập nhật trạng thái người dùng thành công", data));
  };
}
