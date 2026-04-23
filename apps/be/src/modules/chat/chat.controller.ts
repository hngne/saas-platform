import { Request, Response } from "express";
import { getTenantDB } from "@/configs/tenant-db";
import { APIResponse } from "@/shared/utils/response.util";
import { ChatService } from "./chat.service";

import prisma from "@/configs/database";

export class ChatController {
  private getService(req: Request) {
    const dbName = req.user?.dbName || req.tenant?.db_name;
    if (!dbName) throw new Error("Không xác định được tenant");
    const db = getTenantDB(dbName);
    return new ChatService(db);
  }

  private async getChatUser(req: Request) {
    let tenantId = req.user?.tenantId || req.tenant?.id;
    let tenantSlug = req.tenant?.slug;
    let dbName = req.user?.dbName || req.tenant?.db_name;

    if (!tenantSlug && tenantId) {
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
      if (tenant) tenantSlug = tenant.slug;
    }

    return {
      tenantId: tenantId || "",
      tenantSlug: tenantSlug || "",
      userId: req.user!.sub,
      userType: req.user!.userType as "CUSTOMER" | "USER",
      userName: (req as any).user?.name,
      dbName: dbName || "",
    };
  }

  /** Gửi tin nhắn → nhận phản hồi AI */
  sendMessage = async (req: Request, res: Response) => {
    const { session_id, message } = req.body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return res.status(400).json(APIResponse.BadRequest("Tin nhắn không được để trống"));
    }

    const user = await this.getChatUser(req);
    const data = await this.getService(req).sendMessage(user, {
      sessionId: session_id,
      message: message.trim(),
    });

    res.status(200).json(APIResponse.OK("Phản hồi từ AI", data));
  };

  /** Danh sách session của user */
  getSessions = async (req: Request, res: Response) => {
    const user = await this.getChatUser(req);
    const data = await this.getService(req).getSessions(user);
    res.status(200).json(APIResponse.OK("Lấy danh sách cuộc hội thoại", data));
  };

  /** Lịch sử chat của 1 session */
  getHistory = async (req: Request, res: Response) => {
    const user = await this.getChatUser(req);
    const data = await this.getService(req).getHistory(user, req.params.sessionId as string);
    res.status(200).json(APIResponse.OK("Lấy lịch sử chat", data));
  };
}
