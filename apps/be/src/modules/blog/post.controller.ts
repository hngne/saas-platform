import { Request, Response } from "express";
import { PostService } from "./post.service";
import { getTenantDB } from "@/configs/tenant-db";
import { APIResponse } from "@/shared/utils/response.util";
import { postFilterSchema } from "./post.validator";

export class PostController {
  private getService(req: Request) {
    const db = getTenantDB(req.user!.dbName!);
    return new PostService(db);
  }

  getAll = async (req: Request, res: Response) => {
    const filter = postFilterSchema.parse(req.query);
    const data = await this.getService(req).getAll(filter);
    res
      .status(200)
      .json(APIResponse.OK("Lấy danh sách bài viết thành công", data));
  };

  getById = async (req: Request, res: Response) => {
    const data = await this.getService(req).getById(req.params.id as string);
    res.status(200).json(APIResponse.OK("Lấy bài viết thành công", data));
  };

  create = async (req: Request, res: Response) => {
    const userId = req.user!.sub;
    const data = await this.getService(req).create(req.body, userId);
    res
      .status(201)
      .json(APIResponse.Created("Tạo bài viết thành công", data));
  };

  update = async (req: Request, res: Response) => {
    const data = await this.getService(req).update(
      req.params.id as string,
      req.body,
    );
    res
      .status(200)
      .json(APIResponse.OK("Cập nhật bài viết thành công", data));
  };

  delete = async (req: Request, res: Response) => {
    await this.getService(req).delete(req.params.id as string);
    res.status(200).json(APIResponse.OK("Xóa bài viết thành công"));
  };
}
