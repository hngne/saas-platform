import { Request, Response } from "express";
import { BlogCategoryService } from "./blog-category.service";
import { getTenantDB } from "@/configs/tenant-db";
import { APIResponse } from "@/shared/utils/response.util";
import { toggleActiveSchema } from "./blog-category.validator";

export class BlogCategoryController {
  private getService(req: Request) {
    const db = getTenantDB(req.user!.dbName!);
    return new BlogCategoryService(db);
  }

  getAll = async (req: Request, res: Response) => {
    const data = await this.getService(req).getAll();
    res
      .status(200)
      .json(APIResponse.OK("Lấy danh sách danh mục blog thành công", data));
  };

  getById = async (req: Request, res: Response) => {
    const data = await this.getService(req).getById(req.params.id as string);
    res
      .status(200)
      .json(APIResponse.OK("Lấy danh mục blog thành công", data));
  };

  create = async (req: Request, res: Response) => {
    const data = await this.getService(req).create(req.body);
    res
      .status(201)
      .json(APIResponse.Created("Tạo danh mục blog thành công", data));
  };

  update = async (req: Request, res: Response) => {
    const data = await this.getService(req).update(req.params.id as string, req.body);
    res
      .status(200)
      .json(APIResponse.OK("Cập nhật danh mục blog thành công", data));
  };

  delete = async (req: Request, res: Response) => {
    await this.getService(req).delete(req.params.id as string);
    res.status(200).json(APIResponse.OK("Xóa danh mục blog thành công"));
  };

  toggleActive = async (req: Request, res: Response) => {
    const { is_active } = toggleActiveSchema.parse(req.body);
    await this.getService(req).toggleActive(req.params.id as string, is_active);
    res.status(200).json(APIResponse.OK("Cập nhật trạng thái thành công"));
  };
}
