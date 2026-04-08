import { z } from "zod";

export const getReviewsSchema = z.object({
  query: z.object({
    product_id: z.string().uuid().optional(),
    customer_id: z.string().uuid().optional(),
    rating: z.coerce.number().int().min(1).max(5).optional(),
    is_visible: z.coerce.boolean().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  }),
});

export const toggleVisibleSchema = z.object({
  body: z.object({
    is_visible: z.boolean({ error: "is_visible là bắt buộc" }),
  }),
});
