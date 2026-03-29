import { Request, Response } from "express";
import { AttributeService } from "./attribute.service";
import { getTenantDB } from "@/configs/tenant-db";
import { APIResponse } from "@/shared/utils/response.util";

export class AttributeController {
  private getService(req: Request) {
    const db = getTenantDB(req.user!.dbName!);
    return new AttributeService(db);
  }

  getAll = async (req: Request, res: Response) => {
    const data = await this.getService(req).getAll();
    res
      .status(200)
      .json(APIResponse.OK("Lấy danh sách thuộc tính thành công", data));
  };

  getById = async (req: Request, res: Response) => {
    const data = await this.getService(req).getById(req.params.id as string);
    res.status(200).json(APIResponse.OK("Lấy thuộc tính thành công", data));
  };

  create = async (req: Request, res: Response) => {
    const data = await this.getService(req).create(req.body);
    res
      .status(201)
      .json(APIResponse.Created("Tạo thuộc tính thành công", data));
  };

  update = async (req: Request, res: Response) => {
    const data = await this.getService(req).update(
      req.params.id as string,
      req.body,
    );
    res
      .status(200)
      .json(APIResponse.OK("Cập nhật thuộc tính thành công", data));
  };

  delete = async (req: Request, res: Response) => {
    await this.getService(req).delete(req.params.id as string);
    res.status(200).json(APIResponse.OK("Xóa thuộc tính thành công"));
  };

  // ── Attribute Values ──────────────────────────

  createValue = async (req: Request, res: Response) => {
    const data = await this.getService(req).createValue(
      req.params.id as string,
      req.body,
    );
    res.status(201).json(APIResponse.Created("Thêm giá trị thành công", data));
  };

  updateValue = async (req: Request, res: Response) => {
    const data = await this.getService(req).updateValue(
      req.params.id as string,
      req.params.vid as string,
      req.body,
    );
    res.status(200).json(APIResponse.OK("Cập nhật giá trị thành công", data));
  };

  deleteValue = async (req: Request, res: Response) => {
    await this.getService(req).deleteValue(
      req.params.id as string,
      req.params.vid as string,
    );
    res.status(200).json(APIResponse.OK("Xóa giá trị thành công"));
  };
}
