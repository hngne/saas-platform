import { PrismaClient as RetailClient } from "../../../generated/retail-client";

/**
 * ContextBuilder — Fetch dữ liệu tenant DB để nhồi vào system prompt cho AI.
 *
 * 2 loại context:
 *   - Customer: sản phẩm mới, voucher, khuyến mãi đang diễn ra
 *   - Merchant: tồn kho thấp, sản phẩm bán chạy, gợi ý nhập hàng/khuyến mãi
 */
export class ContextBuilder {
  constructor(private db: RetailClient) {}

  /** Context cho Customer chatbot — hỗ trợ mua sắm & theo dõi đơn hàng */
  async buildCustomerContext(tenantSlug: string, userId: string): Promise<string> {
    const [products, vouchers, promotions, categories, myOrders] = await Promise.all([
      // Sản phẩm mới nhất (top 15, active, chưa xóa)
      this.db.product.findMany({
        where: { is_active: true, deleted_at: null },
        orderBy: { created_at: "desc" },
        take: 15,
        include: {
          category: { select: { name: true } },
          variants: {
            where: { is_active: true },
            select: { price: true, stock: true, sku_code: true },
          },
        },
      }),

      // Voucher đang có hiệu lực
      this.db.voucher.findMany({
        where: {
          is_active: true,
          OR: [
            { end_date: null },
            { end_date: { gte: new Date() } },
          ],
        },
        select: {
          code: true,
          name: true,
          discount_type: true,
          discount_value: true,
          min_order_value: true,
          max_discount: true,
        },
      }),

      // Khuyến mãi đang diễn ra
      this.db.promotion.findMany({
        where: {
          is_active: true,
          OR: [
            { end_date: null },
            { end_date: { gte: new Date() } },
          ],
        },
        select: {
          name: true,
          description: true,
          start_date: true,
          end_date: true,
          details: {
            select: {
              discount_percent: true,
              product: { select: { name: true } },
            },
          },
        },
      }),

      // Danh mục
      this.db.category.findMany({
        where: { is_active: true, parent_id: null },
        select: {
          name: true,
          children: { where: { is_active: true }, select: { name: true } },
        },
      }),

      // Đơn hàng gần nhất của User này (Top 5)
      this.db.order.findMany({
        where: { customer_id: userId },
        orderBy: { created_at: "desc" },
        take: 5,
        select: {
          id: true,
          order_status: true,
          payment_status: true,
          total: true,
          created_at: true,
          items: {
            select: {
              quantity: true,
              variant: {
                select: {
                  product: { select: { name: true } }
                }
              }
            },
          },
        },
      }),
    ]);

    const lines: string[] = [];

    lines.push(`=== DANH MỤC SẢN PHẨM ===`);
    categories.forEach((c) => {
      const subs = (c.children || []).map((s) => s.name).join(", ");
      lines.push(`- ${c.name}${subs ? ` (${subs})` : ""}`);
    });

    lines.push(`\n=== SẢN PHẨM (${products.length} sản phẩm mới nhất) ===`);
    products.forEach((p) => {
      const prices = p.variants.map((v) => Number(v.price));
      const minPrice = prices.length > 0 ? Math.min(...prices) : Number(p.base_price);
      const maxPrice = prices.length > 0 ? Math.max(...prices) : Number(p.base_price);
      const totalStock = p.variants.reduce((s, v) => s + v.stock, 0);
      const priceStr = minPrice === maxPrice
        ? `${minPrice.toLocaleString("vi")}đ`
        : `${minPrice.toLocaleString("vi")}đ - ${maxPrice.toLocaleString("vi")}đ`;
      lines.push(`- ${p.name} | Danh mục: ${p.category?.name || "N/A"} | Giá: ${priceStr} | Còn: ${totalStock} sp`);
    });

    lines.push(`\n=== VOUCHER GIẢM GIÁ ===`);
    if (vouchers.length === 0) {
      lines.push("- Hiện chưa có voucher nào.");
    } else {
      vouchers.forEach((v) => {
        const discount = v.discount_type === "PERCENT"
          ? `Giảm ${v.discount_value}%${v.max_discount ? ` (tối đa ${Number(v.max_discount).toLocaleString("vi")}đ)` : ""}`
          : `Giảm ${Number(v.discount_value).toLocaleString("vi")}đ`;
        const minOrder = v.min_order_value ? ` | Đơn tối thiểu: ${Number(v.min_order_value).toLocaleString("vi")}đ` : "";
        lines.push(`- Mã: ${v.code} | ${v.name || ""} | ${discount}${minOrder}`);
      });
    }

    lines.push(`\n=== KHUYẾN MÃI ===`);
    if (promotions.length === 0) {
      lines.push("- Hiện chưa có chương trình khuyến mãi nào.");
    } else {
      promotions.forEach((p) => {
        const prods = (p.details || []).map((d) => `${d.product?.name} (-${d.discount_percent}%)`).join(", ");
        lines.push(`- ${p.name}: ${p.description || ""} | SP: ${prods || "Tất cả"}`);
      });
    }

    lines.push(`\n=== ĐƠN HÀNG CỦA TÔI (KHÁCH HÀNG ĐANG CHAT) ===`);
    if (myOrders.length === 0) {
      lines.push("- Khách hàng chưa có đơn hàng nào.");
    } else {
      myOrders.forEach((o) => {
        const itemNames = o.items.map((i) => `${i.quantity}x ${i.variant?.product?.name || "Sản phẩm"}`).join(", ");
        const dateStr = o.created_at.toLocaleString("vi-VN");
        lines.push(`- Mã đơn: ${o.id.split("-")[0]}... | Ngày: ${dateStr} | Tổng: ${Number(o.total).toLocaleString("vi")}đ | Tình trạng: ${o.order_status} | Thanh toán: ${o.payment_status} | Gồm: ${itemNames}`);
      });
    }

    return lines.join("\n");
  }

  /** Context cho Merchant chatbot — gợi ý quản lý kho/bán hàng */
  async buildMerchantContext(): Promise<string> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [lowStockVariants, recentOrders, topSellingVariants, promotions, vouchers] = await Promise.all([
      // Biến thể tồn kho thấp (< 10)
      this.db.productVariant.findMany({
        where: { is_active: true, stock: { lt: 10 } },
        select: {
          sku_code: true,
          stock: true,
          price: true,
          product: { select: { name: true } },
        },
        orderBy: { stock: "asc" },
        take: 20,
      }),

      // Đơn hàng gần đây (7 ngày)
      this.db.order.findMany({
        where: { created_at: { gte: sevenDaysAgo }, deleted_at: null },
        select: {
          id: true,
          total: true,
          order_status: true,
          payment_status: true,
          payment_method: true,
          created_at: true,
        },
        orderBy: { created_at: "desc" },
        take: 20,
      }),

      // Sản phẩm/variant bán chạy (dựa trên orderItems 30 ngày)
      this.db.orderItem.groupBy({
        by: ["variant_id"],
        _sum: { quantity: true },
        where: {
          order: {
            created_at: { gte: thirtyDaysAgo },
            order_status: { not: "CANCELLED" },
          },
        },
        orderBy: { _sum: { quantity: "desc" } },
        take: 10,
      }),

      // Khuyến mãi hiện tại
      this.db.promotion.findMany({
        where: { is_active: true },
        select: { name: true, start_date: true, end_date: true },
      }),

      // Voucher đang dùng
      this.db.voucher.findMany({
        where: { is_active: true },
        select: { code: true, name: true, used_count: true, usage_limit: true },
      }),
    ]);

    // Fetch variant + product names cho top selling
    const topVariantIds = topSellingVariants.map((t) => t.variant_id);
    const topVariants = topVariantIds.length > 0
      ? await this.db.productVariant.findMany({
          where: { id: { in: topVariantIds } },
          select: { id: true, sku_code: true, product: { select: { name: true } } },
        })
      : [];
    const variantNameMap = new Map(topVariants.map((v) => [v.id, `${v.product?.name} (${v.sku_code || "default"})`]));

    const lines: string[] = [];

    lines.push(`=== TỒN KHO THẤP (< 10 SP) ===`);
    if (lowStockVariants.length === 0) {
      lines.push("- Tất cả sản phẩm đều đủ tồn kho.");
    } else {
      lowStockVariants.forEach((v) => {
        lines.push(`- ${v.product?.name} (SKU: ${v.sku_code || "N/A"}) | Còn: ${v.stock} sp | Giá: ${Number(v.price).toLocaleString("vi")}đ`);
      });
    }

    lines.push(`\n=== ĐƠN HÀNG GẦN ĐÂY (7 ngày, ${recentOrders.length} đơn) ===`);
    const paidRevenue = recentOrders.reduce(
      (s, o) =>
        o.payment_status === "PAID" && o.order_status !== "CANCELLED"
          ? s + Number(o.total)
          : s,
      0,
    );
    const fulfilledOrders = recentOrders.filter((o) => ["DELIVERED", "COMPLETED"].includes(o.order_status)).length;
    const customerConfirmedOrders = recentOrders.filter((o) => o.order_status === "COMPLETED").length;
    const cancelledOrders = recentOrders.filter((o) => o.order_status === "CANCELLED").length;
    const processingOrders = recentOrders.length - fulfilledOrders - cancelledOrders;
    lines.push(`- Doanh thu đã thanh toán, không tính đơn hủy: ${paidRevenue.toLocaleString("vi")}đ`);
    lines.push(`- Đã giao/hoàn tất: ${fulfilledOrders} (khách đã xác nhận nhận hàng: ${customerConfirmedOrders}) | Hủy: ${cancelledOrders} | Đang xử lý: ${processingOrders} | Tổng: ${recentOrders.length}`);
    lines.push(`- Lưu ý trạng thái: DELIVERED = shop đã giao xong; COMPLETED = khách hàng đã bấm xác nhận đã nhận hàng. Khi phân tích vận hành, xem DELIVERED + COMPLETED là nhóm đã hoàn tất giao hàng.`);

    lines.push(`\n=== SẢN PHẨM BÁN CHẠY (30 ngày) ===`);
    if (topSellingVariants.length === 0) {
      lines.push("- Chưa có dữ liệu bán hàng.");
    } else {
      topSellingVariants.forEach((t) => {
        const name = variantNameMap.get(t.variant_id) || t.variant_id;
        lines.push(`- ${name} | Đã bán: ${t._sum?.quantity ?? 0}`);
      });
    }

    lines.push(`\n=== KHUYẾN MÃI HIỆN TẠI ===`);
    if (promotions.length === 0) {
      lines.push("- Chưa có chương trình khuyến mãi nào.");
    } else {
      promotions.forEach((p) => {
        const endStr = p.end_date ? ` (đến ${p.end_date.toLocaleDateString("vi")})` : " (không giới hạn)";
        lines.push(`- ${p.name}${endStr}`);
      });
    }

    lines.push(`\n=== VOUCHER ===`);
    if (vouchers.length === 0) {
      lines.push("- Chưa có voucher nào.");
    } else {
      vouchers.forEach((v) => {
        const usageStr = v.usage_limit ? `${v.used_count}/${v.usage_limit}` : `${v.used_count}/∞`;
        lines.push(`- ${v.code} (${v.name || ""}) | Đã dùng: ${usageStr}`);
      });
    }

    return lines.join("\n");
  }
}
