import { z } from "zod";

export const createShippingSchema = z.object({
  name: z.string().min(1, "Tên phương thức không được để trống"),
  fee: z.number().min(0, "Phí vận chuyển không được âm"),
  estimated_days: z.number().int().min(1).optional().nullable(),
  is_active: z.boolean().default(true),
});

export const updateShippingSchema = createShippingSchema.partial();

export const toggleActiveSchema = z.object({
  is_active: z.boolean({ error: "is_active là bắt buộc" }),
});

export type CreateShippingDto = z.infer<typeof createShippingSchema>;
export type UpdateShippingDto = z.infer<typeof updateShippingSchema>;
