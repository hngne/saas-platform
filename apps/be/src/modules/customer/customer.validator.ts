import { z } from "zod";

export const customerStatusSchema = z.enum(["ACTIVE", "INACTIVE", "BANNED"]);

export const customerFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  status: customerStatusSchema.optional(),
  sort_by: z.enum(["created_at", "name", "email", "status"]).default("created_at"),
  sort_order: z.enum(["asc", "desc"]).default("desc"),
});

export const updateCustomerStatusSchema = z.object({
  status: customerStatusSchema,
});

export type CustomerFilterDto = z.infer<typeof customerFilterSchema>;
