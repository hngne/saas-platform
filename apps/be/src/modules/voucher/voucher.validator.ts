import { z } from "zod";

const baseVoucherSchema = z.object({
  code: z.string().min(1, "Mã voucher không được để trống").toUpperCase(),
  name: z.string().optional().nullable(),
  discount_type: z.enum(["FIXED", "PERCENT"]),
  discount_value: z.number().positive("Giá trị giảm phải lớn hơn 0"),
  min_order_value: z.number().min(0).optional().nullable(),
  max_discount: z.number().min(0).optional().nullable(),
  usage_limit: z.number().int().min(1).optional().nullable(),
  start_date: z.coerce.date().optional().nullable(),
  end_date: z.coerce.date().optional().nullable(),
  is_active: z.boolean().default(true),
});

export const createVoucherSchema = baseVoucherSchema
  .refine(
    (data) => {
      if (data.discount_type === "PERCENT" && data.discount_value > 100) {
        return false;
      }
      return true;
    },
    {
      message: "Giảm theo % không được vượt quá 100",
      path: ["discount_value"],
    },
  )
  .refine(
    (data) => {
      if (
        data.start_date &&
        data.end_date &&
        data.end_date <= data.start_date
      ) {
        return false;
      }
      return true;
    },
    { message: "Ngày kết thúc phải sau ngày bắt đầu", path: ["end_date"] },
  );

export const updateVoucherSchema = baseVoucherSchema.partial().refine(
  (data) => {
    if (
      data.discount_type === "PERCENT" &&
      data.discount_value !== undefined &&
      data.discount_value > 100
    ) {
      return false;
    }
    return true;
  },
  {
    message: "Giảm theo % không được vượt quá 100",
    path: ["discount_value"],
  },
);

export const voucherFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  discount_type: z.enum(["FIXED", "PERCENT"]).optional(),
  is_active: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  date_from: z.coerce.date().optional(),
  date_to: z.coerce.date().optional(),
});

export const toggleActiveSchema = z.object({
  is_active: z.boolean({ error: "is_active là bắt buộc" }),
});

export type CreateVoucherDto = z.infer<typeof createVoucherSchema>;
export type UpdateVoucherDto = z.infer<typeof updateVoucherSchema>;
export type VoucherFilterDto = z.infer<typeof voucherFilterSchema>;
