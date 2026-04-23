import { z } from "zod";

export const addCartItemSchema = z.object({
  variant_id: z.string().uuid("variant_id không hợp lệ"),
  quantity: z.number().int().min(1, "Số lượng tối thiểu là 1"),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(1, "Số lượng tối thiểu là 1"),
});

export type AddCartItemDto = z.infer<typeof addCartItemSchema>;
export type UpdateCartItemDto = z.infer<typeof updateCartItemSchema>;
