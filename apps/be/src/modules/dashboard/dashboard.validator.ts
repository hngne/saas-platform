import { z } from "zod";

export const dashboardFilterSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  type: z.enum(["day", "month", "year"]).default("day"),
});

export const topFilterSchema = z.object({
  top: z.coerce.number().int().min(1).max(50).default(5),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const exportFilterSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  type: z.enum(["day", "month", "year"]).default("day"),
});

export type DashboardFilterDto = z.infer<typeof dashboardFilterSchema>;
export type TopFilterDto = z.infer<typeof topFilterSchema>;
export type ExportFilterDto = z.infer<typeof exportFilterSchema>;
