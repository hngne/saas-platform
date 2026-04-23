import { z } from "zod";

export const checkoutSchema = z.object({
  receiver_name: z.string().min(2, "Tên người nhận phải có ít nhất 2 ký tự"),
  receiver_phone: z.string().min(9, "Số điện thoại không hợp lệ"),
  shipping_address: z.string().min(5, "Địa chỉ giao hàng không hợp lệ"),
  shipping_method_id: z.string().uuid("shipping_method_id không hợp lệ").optional(),
  pickup_store_id: z.string().uuid("pickup_store_id không hợp lệ").optional(),
  voucher_code: z.string().optional(),
  payment_method: z.enum(["COD", "VNPAY"], {
    message: "Phương thức thanh toán phải là COD hoặc VNPAY",
  }),
  note: z.string().optional(),
});

export type CheckoutDto = z.infer<typeof checkoutSchema>;

export const validateVoucherSchema = z.object({
  code: z.string().min(1, "Vui lòng nhập mã giảm giá"),
  subtotal: z.coerce.number().min(0),
  shipping_fee: z.coerce.number().min(0).optional().default(0),
});

export type ValidateVoucherDto = z.infer<typeof validateVoucherSchema>;
