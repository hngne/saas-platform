import { z } from "zod";

export const adjustInventorySchema = z.object({
  variant_id: z.string().uuid("variant_id không hợp lệ"),
  type: z.enum(["IN", "OUT", "ADJUST"]),
  quantity: z.number().int().positive("Số lượng phải lớn hơn 0"),
  note: z.string().optional().nullable(),
});

export const inventoryFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  category_id: z.string().uuid().optional(),
  low_stock: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  sort_order: z.enum(["asc", "desc"]).default("asc"),
});

export const logFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  variant_id: z.string().uuid().optional(),
  type: z.enum(["IN", "OUT", "ADJUST", "RETURN"]).optional(),
  date_from: z.coerce.date().optional(),
  date_to: z.coerce.date().optional(),
});

export type AdjustInventoryDto = z.infer<typeof adjustInventorySchema>;
export type InventoryFilterDto = z.infer<typeof inventoryFilterSchema>;
export type LogFilterDto = z.infer<typeof logFilterSchema>;
