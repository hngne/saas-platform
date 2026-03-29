import { z } from "zod";

export const updateOrderStatusSchema = z.object({
  order_status: z.enum(["PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]),
  note: z.string().optional().nullable(),
});

export const orderFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  order_status: z
    .enum(["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"])
    .optional(),
  payment_status: z.enum(["PENDING", "PAID", "FAILED", "REFUNDED"]).optional(),
  payment_method: z.enum(["COD", "VNPAY"]).optional(),
  date_from: z.coerce.date().optional(),
  date_to: z.coerce.date().optional(),
  search: z.string().optional(), // tìm theo tên/sđt người nhận
  sort_order: z.enum(["asc", "desc"]).default("desc"),
});

export type UpdateOrderStatusDto = z.infer<typeof updateOrderStatusSchema>;
export type OrderFilterDto = z.infer<typeof orderFilterSchema>;
