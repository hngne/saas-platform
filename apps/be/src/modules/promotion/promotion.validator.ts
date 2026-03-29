import { z } from "zod";

export const createPromotionSchema = z
  .object({
    name: z.string().min(1, "Tên khuyến mãi không được để trống"),
    description: z.string().optional().nullable(),
    start_date: z.coerce.date().optional().nullable(),
    end_date: z.coerce.date().optional().nullable(),
    is_active: z.boolean().default(true),
    details: z
      .array(
        z.object({
          product_id: z.string().uuid("product_id không hợp lệ"),
          discount_percent: z
            .number()
            .int()
            .min(1)
            .max(100, "Giảm giá không được vượt quá 100%"),
        }),
      )
      .min(1, "Phải có ít nhất 1 sản phẩm khuyến mãi"),
  })
  .refine(
    (data) => {
      if (data.start_date && data.end_date && data.end_date <= data.start_date)
        return false;
      return true;
    },
    { message: "Ngày kết thúc phải sau ngày bắt đầu", path: ["end_date"] },
  );

export const updatePromotionSchema = z
  .object({
    name: z.string().min(1).optional(),
    description: z.string().optional().nullable(),
    start_date: z.coerce.date().optional().nullable(),
    end_date: z.coerce.date().optional().nullable(),
    is_active: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.start_date && data.end_date && data.end_date <= data.start_date)
        return false;
      return true;
    },
    { message: "Ngày kết thúc phải sau ngày bắt đầu", path: ["end_date"] },
  );

export const addProductSchema = z.object({
  product_id: z.string().uuid("product_id không hợp lệ"),
  discount_percent: z
    .number()
    .int()
    .min(1)
    .max(100, "Giảm giá không được vượt quá 100%"),
});

export const updateProductSchema = z.object({
  discount_percent: z
    .number()
    .int()
    .min(1)
    .max(100, "Giảm giá không được vượt quá 100%"),
});

export const promotionFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  is_active: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  date_from: z.coerce.date().optional(),
  date_to: z.coerce.date().optional(),
});

export const toggleActiveSchema = z.object({
  is_active: z.boolean({ error: "is_active là bắt buộc" }),
});

export type CreatePromotionDto = z.infer<typeof createPromotionSchema>;
export type UpdatePromotionDto = z.infer<typeof updatePromotionSchema>;
export type AddProductDto = z.infer<typeof addProductSchema>;
export type UpdateProductDto = z.infer<typeof updateProductSchema>;
export type PromotionFilterDto = z.infer<typeof promotionFilterSchema>;
