import { Request, Response } from "express";
import { getTenantDB } from "@/configs/tenant-db";
import { APIResponse } from "@/shared/utils/response.util";
import { NotificationService } from "./notification.service";

export class NotificationController {
  private getService(req: Request) {
    const db = getTenantDB(req.user!.dbName!);
    return new NotificationService(db);
  }

  /** Lấy danh sách notification của user hiện tại */
  getMyNotifications = async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const data = await this.getService(req).getByUser(
      req.user!.sub,
      req.user!.userType,
      page,
      limit,
    );
    res.status(200).json(APIResponse.OK("Lấy thông báo thành công", data));
  };

  /** Đánh dấu 1 notification đã đọc */
  markAsRead = async (req: Request, res: Response) => {
    await this.getService(req).markAsRead(req.params.id as string, req.user!.sub, req.user!.userType);
    res.status(200).json(APIResponse.OK("Đã đánh dấu đọc"));
  };

  /** Đánh dấu tất cả đã đọc */
  markAllAsRead = async (req: Request, res: Response) => {
    await this.getService(req).markAllAsRead(req.user!.sub, req.user!.userType);
    res.status(200).json(APIResponse.OK("Đã đánh dấu tất cả đã đọc"));
  };
}
