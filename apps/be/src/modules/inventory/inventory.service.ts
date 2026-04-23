import { BadRequestException, NotFoundException } from "@/shared/exceptions";
import { PrismaClient as RetailClient } from "../../../generated/retail-client";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { InventoryRepository } from "./inventory.repository";
import {
  AdjustInventoryDto,
  InventoryFilterDto,
  LogFilterDto,
} from "./inventory.validator";

export class InventoryService {
  private repo: InventoryRepository;

  constructor(db: RetailClient) {
    this.repo = new InventoryRepository(db);
  }

  getAll = async (filter: InventoryFilterDto) => {
    return this.repo.findAll(filter);
  };

  getByVariantId = async (variantId: string) => {
    const variant = await this.repo.findVariantById(variantId);
    if (!variant) throw new NotFoundException("Biến thể không tồn tại");
    const logs = await this.repo.findRecentLogs(variantId);
    return { ...variant, recent_logs: logs };
  };

  getLogs = async (filter: LogFilterDto) => {
    return this.repo.findLogs(filter);
  };

  adjust = async (dto: AdjustInventoryDto, userId: string) => {
    const variant = await this.repo.findVariantById(dto.variant_id);
    if (!variant) throw new NotFoundException("Biến thể không tồn tại");

    // OUT không được xuất quá tồn kho
    if (dto.type === "OUT" && variant.stock < dto.quantity) {
      throw new BadRequestException(
        `Tồn kho không đủ! Hiện có ${variant.stock}, cần xuất ${dto.quantity}`,
      );
    }

    // ADJUST không được set âm
    if (dto.type === "ADJUST" && dto.quantity < 0) {
      throw new BadRequestException("Số lượng điều chỉnh không được âm");
    }

    const result = await this.repo.adjustStock(dto, userId);
    if (!result) throw new BadRequestException("Điều chỉnh kho thất bại");
    return result;
  };

  getLowStock = async () => {
    return this.repo.findLowStockVariants();
  };

  exportPdf = async (filter: InventoryFilterDto): Promise<Buffer> => {
    const rows: any[] = await this.repo.findAllForExport(filter);

    const getVariantInfo = (variantValues?: any[]) => {
      const labels = (variantValues || [])
        .map((entry) => {
          const attributeName = entry?.attribute_value?.attribute?.name;
          const value = entry?.attribute_value?.value;
          if (!attributeName || !value) return "";
          return `${attributeName}: ${value}`;
        })
        .filter(Boolean);

      return labels.length ? labels.join(" / ") : "Phiên bản mặc định";
    };

    const getStatus = (stock: number) => {
      if (stock <= 0) return "Hết hàng";
      if (stock <= 5) return "Sắp hết";
      return "Còn hàng";
    };

    const truncateText = (text: string, maxLength: number) => {
      if (text.length <= maxLength) return text;
      return `${text.slice(0, maxLength - 1)}…`;
    };

    const totalSku = rows.length;
    const outOfStock = rows.filter((row) => row.stock <= 0).length;
    const lowStock = rows.filter((row) => row.stock > 0 && row.stock <= 5).length;
    const healthyStock = rows.filter((row) => row.stock > 5).length;

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 36, size: "A4", layout: "landscape" });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const fontsDir = path.resolve(__dirname, "../../../assets/fonts");
      const candidates = [
        { regular: path.join(fontsDir, "Arial-Regular.ttf"), bold: path.join(fontsDir, "Arial-Bold.ttf") },
        { regular: "C:\\Windows\\Fonts\\arial.ttf", bold: "C:\\Windows\\Fonts\\arialbd.ttf" },
        { regular: path.join(fontsDir, "Roboto-Regular.ttf"), bold: path.join(fontsDir, "Roboto-Bold.ttf") },
      ];

      let fontLoaded = false;
      for (const candidate of candidates) {
        if (fs.existsSync(candidate.regular) && fs.existsSync(candidate.bold)) {
          try {
            doc.registerFont("VNFont", candidate.regular);
            doc.registerFont("VNFont-Bold", candidate.bold);
            fontLoaded = true;
            break;
          } catch {
            // try next font candidate
          }
        }
      }

      if (!fontLoaded) {
        doc.registerFont("VNFont", "Helvetica");
        doc.registerFont("VNFont-Bold", "Helvetica-Bold");
      }

      const marginX = 36;
      const pageWidth = doc.page.width - marginX * 2;
      const pageBottom = doc.page.height - 40;
      const tableHeaders = ["STT", "Sản phẩm", "Biến thể", "SKU", "Danh mục", "Tồn", "Trạng thái"];
      const colWidths = [36, 150, 180, 120, 110, 56, 74];
      let currentY = 36;

      const drawHeader = (firstPage = false) => {
        doc.font("VNFont").fontSize(10).fillColor("#9CA3AF")
          .text("SHOPFLOW | INVENTORY REPORT", marginX, currentY, { width: pageWidth, align: "right" });
        doc.font("VNFont-Bold").fontSize(firstPage ? 20 : 16).fillColor("#1F2937")
          .text("BÁO CÁO TỒN KHO", marginX, currentY + 18);
        doc.font("VNFont").fontSize(10).fillColor("#6B7280")
          .text(`Xuất ngày: ${new Date().toLocaleString("vi-VN")}`, marginX, currentY + 44);

        const filters: string[] = [
          filter.search ? `Từ khóa: ${filter.search}` : "Từ khóa: Tất cả",
          filter.category_id ? "Danh mục: Đã áp dụng bộ lọc" : "Danh mục: Tất cả",
          filter.low_stock ? "Phạm vi: SKU sắp hết hàng" : "Phạm vi: Toàn bộ SKU",
          `Sắp xếp: ${filter.sort_order === "asc" ? "Tồn thấp đến cao" : "Tồn cao đến thấp"}`,
        ];

        doc.font("VNFont").fontSize(9).fillColor("#6B7280")
          .text(filters.join("  |  "), marginX, currentY + 60, { width: pageWidth });

        doc.moveTo(marginX, currentY + 80)
          .lineTo(doc.page.width - marginX, currentY + 80)
          .strokeColor("#FF6B2B")
          .lineWidth(2)
          .stroke();

        currentY += firstPage ? 96 : 92;
      };

      const drawSummaryCard = (
        x: number,
        width: number,
        label: string,
        value: number,
        fill: string,
        textColor: string,
      ) => {
        doc.roundedRect(x, currentY, width, 54, 12).fillColor(fill).fill();
        doc.font("VNFont").fontSize(8).fillColor("#6B7280")
          .text(label.toUpperCase(), x + 12, currentY + 10, { width: width - 24 });
        doc.font("VNFont-Bold").fontSize(20).fillColor(textColor)
          .text(String(value), x + 12, currentY + 22, { width: width - 24 });
      };

      const drawTableHeader = () => {
        let x = marginX;
        doc.roundedRect(marginX, currentY, pageWidth, 28, 8).fillColor("#1F2937").fill();
        doc.font("VNFont-Bold").fontSize(9).fillColor("#FFFFFF");

        tableHeaders.forEach((header, index) => {
          doc.text(header, x + 6, currentY + 9, { width: colWidths[index] - 12 });
          x += colWidths[index];
        });

        currentY += 28;
      };

      const ensurePage = (rowHeight: number) => {
        if (currentY + rowHeight <= pageBottom) return;
        doc.addPage({ margin: 36, size: "A4", layout: "landscape" });
        currentY = 36;
        drawHeader();
        drawTableHeader();
      };

      drawHeader(true);

      const gap = 12;
      const cardWidth = (pageWidth - gap * 3) / 4;
      drawSummaryCard(marginX, cardWidth, "Tổng SKU", totalSku, "#FFF7ED", "#F97316");
      drawSummaryCard(marginX + cardWidth + gap, cardWidth, "Còn hàng ổn định", healthyStock, "#ECFDF5", "#059669");
      drawSummaryCard(marginX + (cardWidth + gap) * 2, cardWidth, "Sắp hết hàng", lowStock, "#FFFBEB", "#D97706");
      drawSummaryCard(marginX + (cardWidth + gap) * 3, cardWidth, "Hết hàng", outOfStock, "#FEF2F2", "#DC2626");
      currentY += 72;

      drawTableHeader();

      rows.forEach((row, index) => {
        ensurePage(30);

        const values = [
          `${index + 1}`,
          truncateText(row.product?.name || "Sản phẩm", 28),
          truncateText(getVariantInfo(row.variant_values), 34),
          truncateText(row.sku_code || "Chưa có SKU", 18),
          truncateText(row.product?.category?.name || "Chưa phân loại", 18),
          `${row.stock}`,
          getStatus(row.stock),
        ];

        doc.rect(marginX, currentY, pageWidth, 30)
          .fillColor(index % 2 === 0 ? "#FFFFFF" : "#F9FAFB")
          .fill();

        let x = marginX;
        values.forEach((value, valueIndex) => {
          const align = valueIndex === 5 ? "center" : "left";
          const color =
            valueIndex === 6
              ? row.stock <= 0
                ? "#DC2626"
                : row.stock <= 5
                  ? "#D97706"
                  : "#059669"
              : valueIndex === 5
                ? row.stock <= 0
                  ? "#DC2626"
                  : row.stock <= 5
                    ? "#D97706"
                    : "#111827"
                : "#374151";

          doc.font(valueIndex === 5 || valueIndex === 6 ? "VNFont-Bold" : "VNFont")
            .fontSize(9)
            .fillColor(color)
            .text(value, x + 6, currentY + 10, {
              width: colWidths[valueIndex] - 12,
              align,
            });
          x += colWidths[valueIndex];
        });

        doc.moveTo(marginX, currentY + 30)
          .lineTo(doc.page.width - marginX, currentY + 30)
          .strokeColor("#E5E7EB")
          .lineWidth(0.5)
          .stroke();

        currentY += 30;
      });

      if (!rows.length) {
        doc.roundedRect(marginX, currentY, pageWidth, 56, 10).fillColor("#F9FAFB").fill();
        doc.font("VNFont").fontSize(11).fillColor("#6B7280")
          .text("Không có dữ liệu tồn kho phù hợp với bộ lọc hiện tại.", marginX, currentY + 20, {
            width: pageWidth,
            align: "center",
          });
        currentY += 70;
      }

      doc.font("VNFont").fontSize(9).fillColor("#9CA3AF")
        .text("Tài liệu được tạo tự động từ ShopFlow Inventory.", marginX, doc.page.height - 24, {
          width: pageWidth,
          align: "center",
        });

      doc.end();
    });
  };
}
