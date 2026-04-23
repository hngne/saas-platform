import { Router } from "express";
import { PaymentController } from "./payment.controller";
import { extractTenant } from "@/middlewares/tenant.middleware";
import { authenticate, requireUserType } from "@/middlewares/auth.middleware";

const router = Router();
const controller = new PaymentController();

// ── Tạo URL thanh toán ──
// Cần tenant context (subdomain) để xác định cửa hàng
// Đã được bảo vệ bằng Customer auth
router.post(
  "/payment/create_url",
  extractTenant,
  authenticate, 
  requireUserType("CUSTOMER"),
  controller.createPaymentUrl,
);

// ── IPN: VNPay server-to-server callback ──
// KHÔNG cần auth/tenant — parse tenant từ vnp_TxnRef trong service
router.get("/payment/vnpay_ipn", controller.vnpayIpn);

// ── Return URL: VNPay redirect user về, chỉ verify rồi redirect FE ──
// KHÔNG cần auth — chỉ đọc query params, không update DB
router.get("/payment/vnpay_return", controller.vnpayReturn);

export default router;
