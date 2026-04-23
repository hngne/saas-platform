import { z } from "zod";

export const addressSchema = z.object({
  receiver_name: z.string().min(1, "Tên người nhận không được để trống").max(100),
  phone: z.string().min(9, "Số điện thoại không hợp lệ").max(20),
  province: z.string().min(1, "Vui lòng chọn Tỉnh/Thành phố"),
  district: z.string().min(1, "Vui lòng chọn Quận/Huyện"),
  ward: z.string().min(1, "Vui lòng chọn Phường/Xã"),
  address_detail: z.string().min(1, "Vui lòng nhập địa chỉ cụ thể"),
  is_default: z.boolean().optional().default(false),
});

export const updateAddressSchema = addressSchema.partial();
