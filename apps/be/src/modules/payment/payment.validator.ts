import { z } from "zod";

// DTO khi Customer gọi API tạo URL thanh toán VNPay
export const CreatePaymentUrlDto = z.object({
  order_id: z.string().uuid("order_id phải là UUID hợp lệ"),
  bank_code: z.string().optional(),
  language: z.enum(["vn", "en"]).default("vn"),
});

export type CreatePaymentUrlDto = z.infer<typeof CreatePaymentUrlDto>;
