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

  getOrderStatus = async () => {
    return this.repo.getOrderStatusDistribution();
  };

  getRecentOrders = async () => {
    return this.repo.getRecentOrders(5);
  };

  // ── Export Excel ──────────────────────────────────
  exportExcel = async (filter: ExportFilterDto): Promise<Buffer> => {
    const [data, summary, topSelling, orderStatus] = await Promise.all([
      this.repo.getRevenueRaw(filter),
      this.repo.getSummary(),
      this.repo.getTopSelling({ top: 10, from: filter.from, to: filter.to }),
      this.repo.getOrderStatusDistribution(),
    ]);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Shopflow";
    workbook.created = new Date();

    const ws = workbook.addWorksheet("Báo Cáo Hoạt Động");

    // Title
    ws.mergeCells("A1:D1");
    const titleCell = ws.getCell("A1");
    titleCell.value = "BÁO CÁO TỔNG QUAN HOẠT ĐỘNG KINH DOANH";
    titleCell.font = { bold: true, size: 16, color: { argb: "FF1E3A5F" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(1).height = 35;

    // Subtitle
    ws.mergeCells("A2:D2");
    const from = filter.from ?? new Date(new Date().setMonth(new Date().getMonth() - 1));
    const to = filter.to ?? new Date();
    ws.getCell("A2").value = `Từ ${from.toLocaleDateString("vi-VN")} đến ${to.toLocaleDateString("vi-VN")}`;
    ws.getCell("A2").alignment = { horizontal: "center" };
    ws.getCell("A2").font = { italic: true, color: { argb: "FF666666" } };

    // --- 1. TỔNG QUAN ---
    ws.mergeCells("A4:D4");
    ws.getCell("A4").value = "1. TỔNG QUAN CÁC CHỈ SỐ";
    ws.getCell("A4").font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
    ws.getCell("A4").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3B82F6" } };

    ws.addRow(["", "", "", ""]);
    ws.addRow(["", "", "", ""]);
    ws.addRow(["", "", "", ""]);
    ws.addRow([]);

    ws.mergeCells("A5:B5"); ws.mergeCells("C5:D5");
    ws.getCell("A5").value = `Tổng Doanh Thu: ${Number(summary.revenue.total).toLocaleString("vi-VN")} đ`;
    ws.getCell("C5").value = `Tổng Đơn Hàng: ${summary.orders.total} đơn`;

    ws.mergeCells("A6:B6"); ws.mergeCells("C6:D6");
    ws.getCell("A6").value = `Doanh Thu Hôm Nay: ${Number(summary.revenue.today).toLocaleString("vi-VN")} đ`;
    ws.getCell("C6").value = `Đơn Hôm Nay: ${summary.orders.today} đơn`;

    ws.mergeCells("A7:B7"); ws.mergeCells("C7:D7");
    ws.getCell("A7").value = `Đơn Chờ Xử Lý: ${summary.orders.pending} đơn`;
    ws.getCell("C7").value = `Sản Phẩm Sắp Hết: ${summary.products.low_stock} SP`;

    // --- 2. CHI TIẾT DOANH THU ---
    const typeLabel = filter.type === "year" ? "Năm" : filter.type === "month" ? "Tháng" : "Ngày";
    const startRowRev = ws.rowCount + 1;
    ws.mergeCells(`A${startRowRev}:D${startRowRev}`);
    ws.getCell(`A${startRowRev}`).value = "2. BIỂU ĐỒ DOANH THU THEO THỜI GIAN";
    ws.getCell(`A${startRowRev}`).font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
    ws.getCell(`A${startRowRev}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3B82F6" } };

    const headerRev = ws.addRow(["STT", typeLabel, "Số Đơn Hàng", "Doanh Thu (VNĐ)"]);
    headerRev.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };
      cell.alignment = { horizontal: "center" };
    });

    let totalRev = 0, totalOrders = 0;
    data.forEach((item, index) => {
      const row = ws.addRow([index + 1, item.time, item.order_count, item.revenue]);
      totalRev += item.revenue;
      totalOrders += item.order_count;
      row.getCell(4).numFmt = '#,##0 "₫"';
    });

    const totalRow = ws.addRow(["", "TỔNG CỘNG", totalOrders, totalRev]);
    totalRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF6B2B" } };
    });
    totalRow.getCell(4).numFmt = '#,##0 "₫"';
    ws.addRow([]);

    // --- 3. TOP SẢN PHẨM ---
    const startRowTop = ws.rowCount + 1;
    ws.mergeCells(`A${startRowTop}:D${startRowTop}`);
    ws.getCell(`A${startRowTop}`).value = "3. SẢN PHẨM BÁN CHẠY NHẤT";
    ws.getCell(`A${startRowTop}`).font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
    ws.getCell(`A${startRowTop}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3B82F6" } };

    const headerTop = ws.addRow(["STT", "Tên Sản Phẩm", "Đã Bán", "Doanh Thu SP"]);
    headerTop.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };
    });

    topSelling.forEach((p, idx) => {
      const row = ws.addRow([idx + 1, p.product_name, p.total_sold, p.total_revenue]);
      row.getCell(4).numFmt = '#,##0 "₫"';
    });
    ws.addRow([]);

    // --- 4. TRẠNG THÁI ĐƠN HÀNG ---
    const startRowOrd = ws.rowCount + 1;
    ws.mergeCells(`A${startRowOrd}:D${startRowOrd}`);
    ws.getCell(`A${startRowOrd}`).value = "4. TỈ LỆ TRẠNG THÁI ĐƠN HÀNG";
    ws.getCell(`A${startRowOrd}`).font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
    ws.getCell(`A${startRowOrd}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3B82F6" } };

    const headerOrd = ws.addRow(["STT", "Trạng Thái", "Số Đơn", "Tỉ lệ (%)"]);
    headerOrd.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };
    });

    orderStatus.breakdown.forEach((o, idx) => {
      ws.addRow([idx + 1, o.status, o.count, `${o.percentage}%`]);
    });

    // Cột width
    ws.getColumn(1).width = 6;
    ws.getColumn(2).width = 40;
    ws.getColumn(3).width = 25;
    ws.getColumn(4).width = 25;

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  };

  // ── Export PDF ──────────────────────────────────
  exportPdf = async (filter: ExportFilterDto): Promise<Buffer> => {
    const [data, summary, topSelling] = await Promise.all([
      this.repo.getRevenueRaw(filter),
      this.repo.getSummary(),
      this.repo.getTopSelling({ top: 5, from: filter.from, to: filter.to })
    ]);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: "A4" });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // ── Font registration: ưu tiên Arial (Windows, hỗ trợ tiếng Việt tốt) ──
      const fontsDir = path.resolve(__dirname, "../../../assets/fonts");
      const candidates = [
        // 1. Arial từ project assets (đã copy từ Windows)
        { regular: path.join(fontsDir, "Arial-Regular.ttf"), bold: path.join(fontsDir, "Arial-Bold.ttf") },
        // 2. Arial trực tiếp từ Windows Fonts
        { regular: "C:\\Windows\\Fonts\\arial.ttf", bold: "C:\\Windows\\Fonts\\arialbd.ttf" },
        // 3. Roboto từ project assets
        { regular: path.join(fontsDir, "Roboto-Regular.ttf"), bold: path.join(fontsDir, "Roboto-Bold.ttf") },
      ];

      let fontLoaded = false;
      for (const c of candidates) {
        if (fs.existsSync(c.regular) && fs.existsSync(c.bold)) {
          try {
            doc.registerFont("VNFont", c.regular);
            doc.registerFont("VNFont-Bold", c.bold);
            fontLoaded = true;
            break;
          } catch { /* try next */ }
        }
      }
      if (!fontLoaded) {
        doc.registerFont("VNFont", "Helvetica");
        doc.registerFont("VNFont-Bold", "Helvetica-Bold");
      }

      const from = filter.from ?? new Date(new Date().setMonth(new Date().getMonth() - 1));
      const to = filter.to ?? new Date();
      const pageWidth = doc.page.width - 80;

      // Header
      doc.font("VNFont").fontSize(10).fillColor("#999999").text("HỆ THỐNG CỬA HÀNG", 40, 40, { align: "right" });
      doc.fontSize(18).fillColor("#1E3A5F").font("VNFont-Bold").text("BÁO CÁO HOẠT ĐỘNG KINH DOANH", 40, 70, { align: "center" });
      doc.fontSize(10).fillColor("#666666").font("VNFont")
         .text(`Từ ${from.toLocaleDateString("vi-VN")} đến ${to.toLocaleDateString("vi-VN")}`, 40, 95, { align: "center" });
      
      doc.moveTo(40, 115).lineTo(doc.page.width - 40, 115).strokeColor("#FF6B2B").lineWidth(2).stroke();

      let currentY = 135;

      // ── 1. SUMMARY ──
      doc.fontSize(12).font("VNFont-Bold").fillColor("#FF6B2B").text("1. QUẢN TRỊ TỔNG QUAN", 40, currentY);
      currentY += 20;
      doc.fontSize(10).font("VNFont").fillColor("#333").text(`Tổng Doanh Thu: ${Number(summary.revenue.total).toLocaleString("vi-VN")} đ`, 40, currentY);
      doc.text(`Tổng Đơn Hàng: ${summary.orders.total}`, 250, currentY);
      currentY += 18;
      doc.text(`Đơn Chờ Xử Lý: ${summary.orders.pending}`, 40, currentY);
      doc.text(`Sản phẩm sắp hết (Tồn < 5): ${summary.products.low_stock}`, 250, currentY);
      currentY += 25;

      // ── 2. DOANH THU ──
      doc.fontSize(12).font("VNFont-Bold").fillColor("#FF6B2B").text("2. CHI TIẾT DOANH THU", 40, currentY);
      currentY += 20;

      const colWidths = [40, 120, 100, pageWidth - 260];
      const startX = 40;

      // Table Header Doanh Thu
      doc.rect(startX, currentY, pageWidth, 25).fillColor("#1E3A5F").fill();
      doc.fontSize(10).fillColor("#FFFFFF").font("VNFont-Bold");
      doc.text("STT", startX + 5, currentY + 7, { width: colWidths[0] });
      doc.text("Thời gian", startX + colWidths[0] + 5, currentY + 7, { width: colWidths[1] });
      doc.text("Số Đơn", startX + colWidths[0] + colWidths[1] + 5, currentY + 7, { width: colWidths[2] });
      doc.text("Doanh Thu", startX + colWidths[0] + colWidths[1] + colWidths[2] + 5, currentY + 7, { width: colWidths[3] });
      currentY += 25;

      let totalRev = 0, totalOrders = 0;
      data.forEach((item, index) => {
        if (currentY > doc.page.height - 100) { doc.addPage(); currentY = 40; }
        const h = 22;
        doc.rect(startX, currentY, pageWidth, h).fillColor(index % 2 === 0 ? "#F5F7FA" : "#FFFFFF").fill();
        doc.fontSize(9).fillColor("#333333").font("VNFont");
        doc.text(`${index + 1}`, startX + 5, currentY + 6, { width: colWidths[0] });
        doc.text(item.time, startX + colWidths[0] + 5, currentY + 6, { width: colWidths[1] });
        doc.text(`${item.order_count}`, startX + colWidths[0] + colWidths[1] + 5, currentY + 6, { width: colWidths[2] });
        doc.text(`${item.revenue.toLocaleString("vi-VN")} đ`, startX + colWidths[0] + colWidths[1] + colWidths[2] + 5, currentY + 6, { width: colWidths[3] });
        doc.moveTo(startX, currentY + h).lineTo(startX + pageWidth, currentY + h).strokeColor("#E0E0E0").lineWidth(0.5).stroke();
        totalRev += item.revenue; totalOrders += item.order_count; currentY += h;
      });

      // Total Row
      doc.rect(startX, currentY, pageWidth, 25).fillColor("#FFD700").fill();
      doc.fontSize(10).fillColor("#111").font("VNFont-Bold");
      doc.text("TỔNG CỘNG", startX + colWidths[0] + 5, currentY + 7, { width: colWidths[1] });
      doc.text(`${totalOrders}`, startX + colWidths[0] + colWidths[1] + 5, currentY + 7, { width: colWidths[2] });
      doc.text(`${totalRev.toLocaleString("vi-VN")} đ`, startX + colWidths[0] + colWidths[1] + colWidths[2] + 5, currentY + 7, { width: colWidths[3] });
      currentY += 35;

      if (currentY > doc.page.height - 150) { doc.addPage(); currentY = 40; }

      // ── 3. TOP PRODUCTS ──
      doc.fontSize(12).font("VNFont-Bold").fillColor("#FF6B2B").text("3. TOP 5 SẢN PHẨM BÁN CHẠY", 40, currentY);
      currentY += 20;

      topSelling.forEach((p, i) => {
        doc.fontSize(10).fillColor("#333").font("VNFont").text(`${i + 1}. ${p.product_name} - Bán: ${p.total_sold} - Doanh thu: ${Number(p.total_revenue).toLocaleString('vi-VN')} đ`, 40, currentY);
        currentY += 18;
      });

      currentY += 10;
      doc.moveTo(40, currentY).lineTo(doc.page.width - 40, currentY).strokeColor("#E0E0E0").lineWidth(1).stroke();
      doc.fontSize(9).fillColor("#999999").font("VNFont").text(`Xuất ngày: ${new Date().toLocaleString("vi-VN")}`, 40, currentY + 10, { align: "center" });

      doc.end();
    });
  };
}
