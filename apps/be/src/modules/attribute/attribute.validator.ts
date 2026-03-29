import { z } from "zod";

export const createAttributeSchema = z.object({
  name: z.string().min(1, "Tên thuộc tính không được để trống"),
  values: z
    .array(
      z.object({
        value: z.string().min(1, "Giá trị không được để trống"),
        color_hex: z.string().optional().nullable(),
      }),
    )
    .min(1, "Phải có ít nhất 1 giá trị"),
});

export const updateAttributeSchema = z.object({
  name: z.string().min(1, "Tên thuộc tính không được để trống").optional(),
});

export const createAttributeValueSchema = z.object({
  value: z.string().min(1, "Giá trị không được để trống"),
  color_hex: z.string().optional().nullable(),
});

export const updateAttributeValueSchema = createAttributeValueSchema;

export type CreateAttributeDto = z.infer<typeof createAttributeSchema>;
export type UpdateAttributeDto = z.infer<typeof updateAttributeSchema>;
export type CreateAttributeValueDto = z.infer<
  typeof createAttributeValueSchema
>;
export type UpdateAttributeValueDto = z.infer<
  typeof updateAttributeValueSchema
>;
