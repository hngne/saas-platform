import { Request, Response } from "express";
import { PostCommentService } from "./post-comment.service";
import { getTenantDB } from "@/configs/tenant-db";
import { APIResponse } from "@/shared/utils/response.util";
import {
  commentFilterSchema,
  toggleVisibleSchema,
} from "./post-comment.validator";

export class PostCommentController {
  private getService(req: Request) {
    const db = getTenantDB(req.user!.dbName!);
    return new PostCommentService(db);
  }

  getAll = async (req: Request, res: Response) => {
    const filter = commentFilterSchema.parse(req.query);
    const data = await this.getService(req).getAll(filter);
    res
      .status(200)
      .json(APIResponse.OK("Lấy danh sách bình luận thành công", data));
  };

  getById = async (req: Request, res: Response) => {
    const data = await this.getService(req).getById(req.params.id as string);
    res.status(200).json(APIResponse.OK("Lấy bình luận thành công", data));
  };

  toggleVisible = async (req: Request, res: Response) => {
    const { is_visible } = toggleVisibleSchema.parse(req.body);
    const data = await this.getService(req).toggleVisible(
      req.params.id as string,
      is_visible,
    );
    res
      .status(200)
      .json(
        APIResponse.OK("Cập nhật trạng thái hiển thị thành công", data),
      );
  };

  delete = async (req: Request, res: Response) => {
    await this.getService(req).delete(req.params.id as string);
    res.status(200).json(APIResponse.OK("Xóa bình luận thành công"));
  };
}
