import { Router } from "express";
import authRouter from "@/modules/auth/auth.router";
import tenantRouter from "@/modules/tenant/tenant.router";
import adminRouter from "@/modules/admin/admin.router";
import uploadRouter from "@/modules/upload/upload.router";
import categoryRouter from "@/modules/category/category.router";
import productRouter from "@/modules/product/product.router";
import inventoryRouter from "@/modules/inventory/inventory.router";
import shippingRouter from "@/modules/shipping/shipping.router";
import voucherRouter from "@/modules/voucher/voucher.router";
import orderRouter from "@/modules/order/order.router";
import promotionRouter from "@/modules/promotion/promotion.router";
import dashboardRouter from "@/modules/dashboard/dashboard.router";
import attributeRouter from "@/modules/attribute/attribute.router";

const router = Router();

router.use(adminRouter);
router.use(authRouter);
router.use(tenantRouter);
router.use(uploadRouter);
router.use(categoryRouter);
router.use(productRouter);
router.use(inventoryRouter);
router.use(shippingRouter);
router.use(voucherRouter);
router.use(orderRouter);
router.use(promotionRouter);
router.use(dashboardRouter);
router.use(attributeRouter);

export default router;
