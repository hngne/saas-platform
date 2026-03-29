import { Request, Response } from "express";
import { CategoryService } from "./category.service";
import { getTenantDB } from "@/configs/tenant-db";
import { APIResponse } from "@/shared/utils/response.util";

export class CategoryController {
  private getService(req: Request) {
    const dbName = req.user!.dbName!;
    const db = getTenantDB(dbName);
    return new CategoryService(db);
  }

  getAll = async (req: Request, res: Response) => {
    const data = await this.getService(req).getAll();
    res
      .status(200)
      .json(APIResponse.OK("Lấy danh sách danh mục thành công", data));
  };

  getById = async (req: Request, res: Response) => {
    const data = await this.getService(req).getById(req.params.id as string);
    res.status(200).json(APIResponse.OK("Lấy danh mục thành công", data));
  };

  search = async (req: Request, res: Response) => {
    const keyword = req.query.keyword as string;
    if (!keyword) {
      res.status(400).json(APIResponse.BadRequest("Thiếu từ khóa tìm kiếm"));
      return;
    }
    const data = await this.getService(req).getByName(keyword);
    res.status(200).json(APIResponse.OK("Tìm kiếm danh mục thành công", data));
  };

  create = async (req: Request, res: Response) => {
    const data = await this.getService(req).create(req.body);
    res.status(201).json(APIResponse.Created("Tạo danh mục thành công", data));
  };

  update = async (req: Request, res: Response) => {
    const data = await this.getService(req).update(
      req.params.id as string,
      req.body,
    );
    res.status(200).json(APIResponse.OK("Cập nhật danh mục thành công", data));
  };

  delete = async (req: Request, res: Response) => {
    await this.getService(req).delete(req.params.id as string);
    res.status(200).json(APIResponse.OK("Xóa danh mục thành công"));
  };

  toggleActive = async (req: Request, res: Response) => {
    const { is_active } = req.body;
    if (typeof is_active !== "boolean") {
      res.status(400).json(APIResponse.BadRequest("is_active phải là boolean"));
      return;
    }
    const data = await this.getService(req).toggleActive(
      req.params.id as string,
      is_active,
    );
    res
      .status(200)
      .json(APIResponse.OK("Cập nhật trạng thái thành công", data));
  };
}
