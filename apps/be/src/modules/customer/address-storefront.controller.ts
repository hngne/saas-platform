import { Request, Response } from "express";
import { getTenantDB } from "@/configs/tenant-db";
import { APIResponse } from "@/shared/utils/response.util";
import { AddressStorefrontService } from "./address-storefront.service";

export class AddressStorefrontController {
  private getService(req: Request) {
    const dbName = req.tenant?.db_name;
    if (!dbName) throw new Error("Không xác định được tenant");
    const db = getTenantDB(dbName);
    return new AddressStorefrontService(db);
  }

  getAddresses = async (req: Request, res: Response) => {
    const customerId = req.user!.sub;
    const data = await this.getService(req).getAddresses(customerId);
    res.status(200).json(APIResponse.OK("Lấy danh sách địa chỉ", data));
  };

  createAddress = async (req: Request, res: Response) => {
    const customerId = req.user!.sub;
    const data = await this.getService(req).createAddress(customerId, req.body);
    res.status(201).json(APIResponse.Created("Thêm sổ địa chỉ thành công", data));
  };

  updateAddress = async (req: Request, res: Response) => {
    const customerId = req.user!.sub;
    const id = req.params.id as string;
    const data = await this.getService(req).updateAddress(id, customerId, req.body);
    res.status(200).json(APIResponse.OK("Cập nhật địa chỉ thành công", data));
  };

  deleteAddress = async (req: Request, res: Response) => {
    const customerId = req.user!.sub;
    const id = req.params.id as string;
    await this.getService(req).deleteAddress(id, customerId);
    res.status(200).json(APIResponse.OK("Xóa địa chỉ thành công"));
  };
}
