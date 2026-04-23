import { z } from "zod";

export const staffRoleSchema = z.enum(["OWNER", "STAFF"]);
export const staffStatusSchema = z.enum(["ACTIVE", "INACTIVE", "BANNED"]);

export const staffFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  role: staffRoleSchema.optional(),
  status: staffStatusSchema.optional(),
  sort_by: z
    .enum(["created_at", "name", "email", "role", "status"])
    .default("created_at"),
  sort_order: z.enum(["asc", "desc"]).default("desc"),
});

export const createStaffSchema = z.object({
  email: z.string().trim().email("Email không hợp lệ").max(100),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự").max(100),
  name: z.string().trim().min(1, "Tên nhân viên không được để trống").max(100),
  phone: z.string().trim().max(20).optional().nullable(),
  role: staffRoleSchema.default("STAFF"),
  status: staffStatusSchema.default("ACTIVE"),
});

export const updateStaffSchema = z.object({
  email: z.string().trim().email("Email không hợp lệ").max(100).optional(),
  name: z.string().trim().min(1).max(100).optional().nullable(),
  phone: z.string().trim().max(20).optional().nullable(),
  role: staffRoleSchema.optional(),
  status: staffStatusSchema.optional(),
});

export const updateStaffStatusSchema = z.object({
  status: staffStatusSchema,
});

export type StaffFilterDto = z.infer<typeof staffFilterSchema>;
export type CreateStaffDto = z.infer<typeof createStaffSchema>;
export type UpdateStaffDto = z.infer<typeof updateStaffSchema>;
