import { z } from "zod";

// ─── Post Comment (CMS quản lý) ───────────────────
export const commentFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  post_id: z.string().uuid().optional(),
  is_visible: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
});

export const toggleVisibleSchema = z.object({
  is_visible: z.boolean({ error: "is_visible là bắt buộc" }),
});

export type CommentFilterDto = z.infer<typeof commentFilterSchema>;
