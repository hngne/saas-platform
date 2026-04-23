import { z } from "zod";

export const customerRegisterSchema = z.object({
  name: z.string().min(2, "Tên phải có ít nhất 2 ký tự"),
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
  phone: z.string().optional(),
});

export const customerLoginSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu không được để trống"),
});

export const customerRefreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2, "Tên phải có ít nhất 2 ký tự").optional(),
  phone: z.string().optional(),
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(6, "Mật khẩu cũ không được để trống"),
  newPassword: z.string().min(6, "Mật khẩu mới phải có ít nhất 6 ký tự"),
});

export type CustomerRegisterDto = z.infer<typeof customerRegisterSchema>;
export type CustomerLoginDto = z.infer<typeof customerLoginSchema>;
export type CustomerRefreshDto = z.infer<typeof customerRefreshSchema>;
export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
