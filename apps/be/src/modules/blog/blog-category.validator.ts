import { z } from "zod";

// ─── Blog Category ────────────────────────────────
export const createBlogCategorySchema = z.object({
  name: z.string().min(1, "Tên danh mục không được để trống"),
  is_active: z.boolean().default(true),
});

export const updateBlogCategorySchema = createBlogCategorySchema.partial();

export const toggleActiveSchema = z.object({
  is_active: z.boolean({ error: "is_active là bắt buộc" }),
});

export type CreateBlogCategoryDto = z.infer<typeof createBlogCategorySchema>;
export type UpdateBlogCategoryDto = z.infer<typeof updateBlogCategorySchema>;
