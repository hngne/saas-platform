import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email không được để trống")
    .email("Email không hợp lệ"),

  password: z.string().min(1, "Mật khẩu không được để trống"),
});

export type LoginDto = z.infer<typeof loginSchema>;

export const merchantRegisterSchema = z.object({
  email: z
    .string()
    .min(1, "Email không được để trống")
    .email("Email không hợp lệ"),
  password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự"),
  owner_name: z.string().min(1, "Tên chủ shop không được để trống"),
  store_name: z.string().min(1, "Tên cửa hàng không được để trống"),
  phone: z.string().optional(),
  business_type: z.enum(["RETAIL"]).default("RETAIL"),
});

export type MerchantRegisterDto = z.infer<typeof merchantRegisterSchema>;
