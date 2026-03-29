import { z } from "zod";

// ── Variant schema (dùng trong create product) ──
const variantSchema = z.object({
  sku_code: z.string().optional().nullable(),
  price: z.number().positive("Giá phải lớn hơn 0").optional().nullable(),
  stock: z.number().int().min(0, "Tồn kho không được âm").default(0),
  image_url: z.string().optional().nullable(),
  attribute_value_ids: z.array(z.string().uuid()).default([]),
});

// ── Create Product ──
export const createProductSchema = z.object({
  name: z.string().min(1, "Tên sản phẩm không được để trống"),
  description: z.string().optional().nullable(),
  base_price: z.number().positive("Giá phải lớn hơn 0"),
  category_id: z.string().uuid().optional().nullable(),
  has_variant: z.boolean().default(false),
  material: z.string().optional().nullable(),
  variants: z.array(variantSchema).optional().default([]),
});

// ── Update Product ──
export const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  base_price: z.number().positive().optional(),
  category_id: z.string().uuid().optional().nullable(),
  material: z.string().optional().nullable(),
});

// ── Create Variant ──
export const createVariantSchema = z.object({
  sku_code: z.string().optional().nullable(),
  price: z.number().positive("Giá phải lớn hơn 0").optional().nullable(),
  stock: z.number().int().min(0).default(0),
  image_url: z.string().optional().nullable(),
  attribute_value_ids: z
    .array(z.string().uuid())
    .min(1, "Phải chọn ít nhất 1 thuộc tính"),
});

// ── Update Variant ──
export const updateVariantSchema = z.object({
  sku_code: z.string().optional().nullable(),
  price: z.number().positive().optional().nullable(),
  stock: z.number().int().min(0).optional(),
  image_url: z.string().optional().nullable(),
});

// ── Toggle Active ──
export const toggleActiveSchema = z.object({
  is_active: z.boolean({ error: "is_active là bắt buộc" }),
});

// ── Filter ──
export const productFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  category_id: z.string().uuid().optional(),
  min_price: z.coerce.number().min(0).optional(),
  max_price: z.coerce.number().min(0).optional(),
  is_active: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  has_variant: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  sort_by: z.enum(["created_at", "name", "base_price"]).default("created_at"),
  sort_order: z.enum(["asc", "desc"]).default("desc"),
});

export type CreateProductDto = z.infer<typeof createProductSchema>;
export type UpdateProductDto = z.infer<typeof updateProductSchema>;
export type CreateVariantDto = z.infer<typeof createVariantSchema>;
export type UpdateVariantDto = z.infer<typeof updateVariantSchema>;
export type ProductFilterDto = z.infer<typeof productFilterSchema>;
