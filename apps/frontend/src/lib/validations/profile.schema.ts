import { z } from "zod";

export const genderEnum = z.enum(["male", "female", "other"]);

export const updateProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Họ và tên không được để trống")
    .max(150, "Họ và tên không được vượt quá 150 ký tự"),

  birthday: z
    .string()
    .nullable()
    .optional()
    .refine(
      (val) => {
        if (!val || val.trim() === "") return true;
        return /^\d{4}-\d{2}-\d{2}$/.test(val.trim());
      },
      {
        message: "Ngày sinh phải theo định dạng YYYY-MM-DD",
      }
    )
    .refine(
      (val) => {
        if (!val || val.trim() === "") return true;
        const today = new Date().toISOString().slice(0, 10);
        return val.trim() <= today;
      },
      {
        message: "Ngày sinh không được ở tương lai",
      }
    ),

  gender: genderEnum.nullable().optional(),

  bio: z
    .string()
    .nullable()
    .optional()
    .refine(
      (val) => {
        if (!val || val.trim() === "") return true;
        return val.trim().length <= 500;
      },
      {
        message: "Tiểu sử không được vượt quá 500 ký tự",
      }
    ),
});

export type UpdateProfileFormValues = z.infer<typeof updateProfileSchema>;
