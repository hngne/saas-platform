import { PrismaClient as RetailClient } from "../../../generated/retail-client";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { DashboardRepository } from "./dashboard.repository";
import {
  DashboardFilterDto,
  ExportFilterDto,
  TopFilterDto,
} from "./dashboard.validator";

export class DashboardService {
  private repo: DashboardRepository;

  constructor(db: RetailClient) {
    this.repo = new DashboardRepository(db);
  }

  getSummary = async () => {
    return this.repo.getSummary();
  };

  getRevenue = async (filter: DashboardFilterDto) => {
    return this.repo.getRevenue(filter);
  };

  getTopSelling = async (filter: TopFilterDto) => {
    return this.repo.getTopSelling(filter);
  };

  getTopNotSelling = async (filter: TopFilterDto) => {
    return this.repo.getTopNotSelling(filter);
  };

  // ── Export Excel ──────────────────────────────────
  exportExcel = async (filter: ExportFilterDto): Promise<Buffer> => {
    const data = await this.repo.getRevenueRaw(filter);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Shopflow";
    workbook.created = new Date();

    const ws = workbook.addWorksheet("Doanh Thu");

    const typeLabel =
      filter.type === "year"
        ? "Năm"
        : filter.type === "month"
          ? "Tháng"
          : "Ngày";

    const title =
      filter.type === "year"
        ? "BÁO CÁO DOANH THU THEO NĂM"
        : filter.type === "month"
          ? "BÁO CÁO DOANH THU THEO THÁNG"
          : "BÁO CÁO DOANH THU THEO NGÀY";

    // ── Title ──
    ws.mergeCells("A1:D1");
    const titleCell = ws.getCell("A1");
    titleCell.value = title;
    titleCell.font = { bold: true, size: 16, color: { argb: "FF1E3A5F" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(1).height = 35;

    // ── Subtitle ──
    ws.mergeCells("A2:D2");
    const from =
      filter.from ?? new Date(new Date().setMonth(new Date().getMonth() - 1));
    const to = filter.to ?? new Date();
    ws.getCell("A2").value =
      `Từ ${from.toLocaleDateString("vi-VN")} đến ${to.toLocaleDateString("vi-VN")}`;
    ws.getCell("A2").alignment = { horizontal: "center" };
    ws.getCell("A2").font = { italic: true, color: { argb: "FF666666" } };

    // ── Headers ──
    ws.getRow(4).values = ["STT", typeLabel, "Số Đơn Hàng", "Doanh Thu (VNĐ)"];
    const headerRow = ws.getRow(4);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1E3A5F" },
      };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      };
    });
    headerRow.height = 25;

    // ── Data ──
    let totalRevenue = 0;
    let totalOrders = 0;

    data.forEach((item, index) => {
      const row = ws.addRow([
        index + 1,
        item.time,
        item.order_count,
        item.revenue,
      ]);

      totalRevenue += item.revenue;
      totalOrders += item.order_count;

      // Zebra striping
      if (index % 2 === 0) {
        row.eachCell((cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF5F7FA" },
          };
        });
      }

      // Format tiền
      row.getCell(4).numFmt = '#,##0 "₫"';
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFE0E0E0" } },
          bottom: { style: "thin", color: { argb: "FFE0E0E0" } },
          left: { style: "thin", color: { argb: "FFE0E0E0" } },
          right: { style: "thin", color: { argb: "FFE0E0E0" } },
        };
      });
    });

    // ── Tổng cộng ──
    const totalRow = ws.addRow(["", "TỔNG CỘNG", totalOrders, totalRevenue]);
    totalRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFF6B2B" },
      };
      cell.border = {
        top: { style: "medium" },
        bottom: { style: "medium" },
        left: { style: "thin" },
        right: { style: "thin" },
      };
    });
    totalRow.getCell(4).numFmt = '#,##0 "₫"';

    // ── Cột width ──
    ws.getColumn(1).width = 8;
    ws.getColumn(2).width = 20;
    ws.getColumn(3).width = 18;
    ws.getColumn(4).width = 22;

    // ── Footer ──
    ws.addRow([]);
    const footerRow = ws.addRow([
      `Xuất ngày: ${new Date().toLocaleString("vi-VN")}`,
    ]);
    footerRow.getCell(1).font = { italic: true, color: { argb: "FF999999" } };
    ws.mergeCells(`A${footerRow.number}:D${footerRow.number}`);

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  };

  // ── Export PDF ──────────────────────────────────
  exportPdf = async (filter: ExportFilterDto): Promise<Buffer> => {
    const data = await this.repo.getRevenueRaw(filter);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: "A4" });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // Đăng ký font hỗ trợ Tiếng Việt (Roboto)
      const fontRegularPath = path.join(
        process.cwd(),
        "apps/be/src/assets/fonts/Roboto-Regular.ttf",
      );
      const fontBoldPath = path.join(
        process.cwd(),
        "apps/be/src/assets/fonts/Roboto-Bold.ttf",
      );

      if (fs.existsSync(fontRegularPath) && fs.existsSync(fontBoldPath)) {
        doc.registerFont("Roboto", fontRegularPath);
        doc.registerFont("Roboto-Bold", fontBoldPath);
      } else {
        // Fallback về Helvetica nếu chưa có font
        doc.registerFont("Roboto", "Helvetica");
        doc.registerFont("Roboto-Bold", "Helvetica-Bold");
      }

      const from =
        filter.from ?? new Date(new Date().setMonth(new Date().getMonth() - 1));
      const to = filter.to ?? new Date();

      const title =
        filter.type === "year"
          ? "BÁO CÁO DOANH THU THEO NĂM"
          : filter.type === "month"
            ? "BÁO CÁO DOANH THU THEO THÁNG"
            : "BÁO CÁO DOANH THU THEO NGÀY";

      const typeLabel =
        filter.type === "year"
          ? "Năm"
          : filter.type === "month"
            ? "Tháng"
            : "Ngày";

      const pageWidth = doc.page.width - 80;

      // ── Logo/Brand ──
      doc
        .fontSize(10)
        .fillColor("#999999")
        .text("SHOPFLOW", 40, 40, { align: "right" });

      // ── Title ──
      doc
        .fontSize(18)
        .fillColor("#1E3A5F")
        .font("Roboto-Bold")
        .text(title, 40, 70, { align: "center" });

      doc
        .fontSize(10)
        .fillColor("#666666")
        .font("Roboto")
        .text(
          `Từ ${from.toLocaleDateString("vi-VN")} đến ${to.toLocaleDateString("vi-VN")}`,
          40,
          95,
          { align: "center" },
        );

      // ── Divider ──
      doc
        .moveTo(40, 115)
        .lineTo(doc.page.width - 40, 115)
        .strokeColor("#FF6B2B")
        .lineWidth(2)
        .stroke();

      // ── Table Header ──
      const colWidths = [40, 120, 100, 0];
      colWidths[3] = pageWidth - colWidths[0] - colWidths[1] - colWidths[2];
      const startX = 40;
      let currentY = 130;

      // Header background
      doc.rect(startX, currentY, pageWidth, 25).fillColor("#1E3A5F").fill();

      doc.fontSize(10).fillColor("#FFFFFF").font("Roboto-Bold");
      doc.text("STT", startX + 5, currentY + 7, { width: colWidths[0] });
      doc.text(typeLabel, startX + colWidths[0] + 5, currentY + 7, {
        width: colWidths[1],
      });
      doc.text(
        "Số Đơn",
        startX + colWidths[0] + colWidths[1] + 5,
        currentY + 7,
        { width: colWidths[2] },
      );
      doc.text(
        "Doanh Thu",
        startX + colWidths[0] + colWidths[1] + colWidths[2] + 5,
        currentY + 7,
        { width: colWidths[3] },
      );

      currentY += 25;

      // ── Table Rows ──
      let totalRevenue = 0;
      let totalOrders = 0;

      data.forEach((item, index) => {
        const rowHeight = 22;
        const bgColor = index % 2 === 0 ? "#F5F7FA" : "#FFFFFF";

        doc
          .rect(startX, currentY, pageWidth, rowHeight)
          .fillColor(bgColor)
          .fill();

        doc.fontSize(9).fillColor("#333333").font("Roboto");
        doc.text(`${index + 1}`, startX + 5, currentY + 6, {
          width: colWidths[0],
        });
        doc.text(item.time, startX + colWidths[0] + 5, currentY + 6, {
          width: colWidths[1],
        });
        doc.text(
          `${item.order_count}`,
          startX + colWidths[0] + colWidths[1] + 5,
          currentY + 6,
          { width: colWidths[2] },
        );
        doc.text(
          `${item.revenue.toLocaleString("vi-VN")} ₫`,
          startX + colWidths[0] + colWidths[1] + colWidths[2] + 5,
          currentY + 6,
          { width: colWidths[3] },
        );

        // Border bottom
        doc
          .moveTo(startX, currentY + rowHeight)
          .lineTo(startX + pageWidth, currentY + rowHeight)
          .strokeColor("#E0E0E0")
          .lineWidth(0.5)
          .stroke();

        totalRevenue += item.revenue;
        totalOrders += item.order_count;
        currentY += rowHeight;
      });

      // ── Tổng cộng ──
      doc.rect(startX, currentY, pageWidth, 25).fillColor("#FF6B2B").fill();

      doc.fontSize(10).fillColor("#FFFFFF").font("Roboto-Bold");
      doc.text("TỔNG CỘNG", startX + colWidths[0] + 5, currentY + 7, {
        width: colWidths[1],
      });
      doc.text(
        `${totalOrders}`,
        startX + colWidths[0] + colWidths[1] + 5,
        currentY + 7,
        { width: colWidths[2] },
      );
      doc.text(
        `${totalRevenue.toLocaleString("vi-VN")} ₫`,
        startX + colWidths[0] + colWidths[1] + colWidths[2] + 5,
        currentY + 7,
        { width: colWidths[3] },
      );

      currentY += 35;

      // ── Footer ──
      doc
        .moveTo(40, currentY)
        .lineTo(doc.page.width - 40, currentY)
        .strokeColor("#E0E0E0")
        .lineWidth(1)
        .stroke();

      doc
        .fontSize(9)
        .fillColor("#999999")
        .font("Roboto")
        .text(
          `Xuất ngày: ${new Date().toLocaleString("vi-VN")}`,
          40,
          currentY + 10,
          { align: "center" },
        );

      doc.end();
    });
  };
}
