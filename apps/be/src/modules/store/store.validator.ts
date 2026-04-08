import { z } from "zod";

export const createStoreSchema = z.object({
  name: z.string().min(1, "Tên cửa hàng không được để trống"),
  address: z.string().min(1, "Địa chỉ không được để trống"),
  province: z.string().optional().nullable(),
  district: z.string().optional().nullable(),
  ward: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  open_time: z.string().max(10).optional().nullable(),
  close_time: z.string().max(10).optional().nullable(),
  is_active: z.boolean().default(true),
});

export const updateStoreSchema = createStoreSchema.partial();

export const storeFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  province: z.string().optional(),
  is_active: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
});

export const toggleActiveSchema = z.object({
  is_active: z.boolean({ error: "is_active là bắt buộc" }),
});

export type CreateStoreDto = z.infer<typeof createStoreSchema>;
export type UpdateStoreDto = z.infer<typeof updateStoreSchema>;
export type StoreFilterDto = z.infer<typeof storeFilterSchema>;
