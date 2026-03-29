import { Request, Response } from "express";
import { InventoryService } from "./inventory.service";
import { getTenantDB } from "@/configs/tenant-db";
import { APIResponse } from "@/shared/utils/response.util";
import { BadRequestException } from "@/shared/exceptions";
import {
  adjustInventorySchema,
  inventoryFilterSchema,
  logFilterSchema,
} from "./inventory.validator";

const getParam = (req: Request, key: string): string => {
  const val = req.params[key];
  if (!val || typeof val !== "string") {
    throw new BadRequestException(`Thiếu hoặc sai định dạng param: ${key}`);
  }
  return val;
};

export class InventoryController {
  private getService(req: Request) {
    const db = getTenantDB(req.user!.dbName!);
    return new InventoryService(db);
  }

  getAll = async (req: Request, res: Response) => {
    const filter = inventoryFilterSchema.parse(req.query);
    const data = await this.getService(req).getAll(filter);
    res
      .status(200)
      .json(APIResponse.OK("Lấy danh sách tồn kho thành công", data));
  };

  getByVariantId = async (req: Request, res: Response) => {
    const variantId = getParam(req, "variantId");
    const data = await this.getService(req).getByVariantId(variantId);
    res
      .status(200)
      .json(APIResponse.OK("Lấy chi tiết tồn kho thành công", data));
  };

  getLogs = async (req: Request, res: Response) => {
    const filter = logFilterSchema.parse(req.query);
    const data = await this.getService(req).getLogs(filter);
    res.status(200).json(APIResponse.OK("Lấy lịch sử kho thành công", data));
  };

  adjust = async (req: Request, res: Response) => {
    const dto = adjustInventorySchema.parse(req.body);
    const userId = req.user!.sub;
    const data = await this.getService(req).adjust(dto, userId);
    res.status(200).json(APIResponse.OK("Điều chỉnh kho thành công", data));
  };

  getLowStock = async (req: Request, res: Response) => {
    const data = await this.getService(req).getLowStock();
    res
      .status(200)
      .json(APIResponse.OK("Lấy danh sách tồn kho thấp thành công", data));
  };
}
