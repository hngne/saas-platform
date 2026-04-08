import { z } from "zod";

// ─── Post ─────────────────────────────────────────
export const createPostSchema = z.object({
  blog_category_id: z.string().uuid().optional().nullable(),
  title: z.string().min(1, "Tiêu đề không được để trống"),
  thumbnail_url: z.string().optional().nullable(),
  content: z.string().min(1, "Nội dung không được để trống"),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  tags: z.array(z.string().max(50)).optional().default([]),
});

export const updatePostSchema = createPostSchema.partial();

export const postFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  blog_category_id: z.string().uuid().optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
  tag: z.string().optional(),
});

export type CreatePostDto = z.infer<typeof createPostSchema>;
export type UpdatePostDto = z.infer<typeof updatePostSchema>;
export type PostFilterDto = z.infer<typeof postFilterSchema>;
