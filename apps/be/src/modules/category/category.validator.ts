import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().min(1, "Tên danh mục không được để trống"),
  description: z.string().optional(),
  image_url: z.string().optional(),
  parent_id: z.string().uuid().optional().nullable(),
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
});

export const updateCategorySchema = createCategorySchema.partial();

export type CreateCategoryDto = z.infer<typeof createCategorySchema>;
export type UpdateCategoryDto = z.infer<typeof updateCategorySchema>;

export const toggleActiveSchema = z.object({
  is_active: z.boolean({ error: "is_active là bắt buộc" }),
});
