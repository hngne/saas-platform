import { Request, Response } from "express";
import { DashboardService } from "./dashboard.service";
import { getTenantDB } from "@/configs/tenant-db";
import { APIResponse } from "@/shared/utils/response.util";
import {
  dashboardFilterSchema,
  exportFilterSchema,
  topFilterSchema,
} from "./dashboard.validator";

export class DashboardController {
  private getService(req: Request) {
    if (!req.user || !req.user.dbName) {
      throw new Error("Không thể xác định Tenant Database từ token.");
    }
    const db = getTenantDB(req.user.dbName);
    return new DashboardService(db);
  }

  getSummary = async (req: Request, res: Response) => {
    const data = await this.getService(req).getSummary();
    res
      .status(200)
      .json(APIResponse.OK("Lấy thống kê tổng quan thành công", data));
  };

  getRevenue = async (req: Request, res: Response) => {
    const filter = dashboardFilterSchema.parse(req.query);
    const data = await this.getService(req).getRevenue(filter);
    res.status(200).json(APIResponse.OK("Lấy doanh thu thành công", data));
  };

  getTopSelling = async (req: Request, res: Response) => {
    const filter = topFilterSchema.parse(req.query);
    const data = await this.getService(req).getTopSelling(filter);
    res
      .status(200)
      .json(APIResponse.OK("Lấy top sản phẩm bán chạy thành công", data));
  };

  getTopNotSelling = async (req: Request, res: Response) => {
    const filter = topFilterSchema.parse(req.query);
    const data = await this.getService(req).getTopNotSelling(filter);
    res
      .status(200)
      .json(APIResponse.OK("Lấy top sản phẩm không bán được thành công", data));
  };

  exportExcel = async (req: Request, res: Response) => {
    const filter = exportFilterSchema.parse(req.query);
    const buffer = await this.getService(req).exportExcel(filter);
    const filename = `BaoCaoDoanhThu_${filter.type}_${Date.now()}.xlsx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  };

  exportPdf = async (req: Request, res: Response) => {
    const filter = exportFilterSchema.parse(req.query);
    const buffer = await this.getService(req).exportPdf(filter);
    const filename = `BaoCaoDoanhThu_${filter.type}_${Date.now()}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  };
}
