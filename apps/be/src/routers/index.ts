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
import reviewRouter from "@/modules/review/review.router";
import storeRouter from "@/modules/store/store.router";
import blogCategoryRouter from "@/modules/blog/blog-category.router";
import postRouter from "@/modules/blog/post.router";
import postCommentRouter from "@/modules/blog/post-comment.router";
import staffRouter from "@/modules/staff/staff.router";
import customerRouter from "@/modules/customer/customer.router";
import paymentRouter from "@/modules/payment/payment.router";
import settingsRouter from "@/modules/settings/settings.router";

// ── Storefront routers ──────────────────────────
import customerAuthRouter from "@/modules/auth/customer-auth.router";
import categoryStorefrontRouter from "@/modules/category/category-storefront.router";
import productStorefrontRouter from "@/modules/product/product-storefront.router";
import cartRouter from "@/modules/cart/cart.router";
import orderStorefrontRouter from "@/modules/order/order-storefront.router";
import reviewStorefrontRouter from "@/modules/review/review-storefront.router";
import blogStorefrontRouter from "@/modules/blog/blog-storefront.router";
import storefrontInfoRouter from "@/modules/store/storefront-info.router";
import addressStorefrontRouter from "@/modules/customer/address-storefront.router";
import notificationRouter from "@/modules/notification/notification.router";
import chatRouter from "@/modules/chat/chat.router";
const router = Router();

// ── Admin & Merchant ────────────────────────────
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
router.use(reviewRouter);
router.use(storeRouter);
router.use(blogCategoryRouter);
router.use(postRouter);
router.use(postCommentRouter);
router.use(staffRouter);
router.use(customerRouter);
router.use(paymentRouter);
router.use(settingsRouter);

// ── Storefront (Customer) ───────────────────────
router.use(customerAuthRouter);
router.use(categoryStorefrontRouter);
router.use(productStorefrontRouter);
router.use(cartRouter);
router.use(orderStorefrontRouter);
router.use(reviewStorefrontRouter);
router.use(blogStorefrontRouter);
router.use(storefrontInfoRouter);
router.use(addressStorefrontRouter);

// ── Shared (cả Merchant lẫn Customer) ──────────
router.use(notificationRouter);
router.use(chatRouter);

export default router;
