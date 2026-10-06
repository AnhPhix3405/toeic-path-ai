import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Vui lòng nhập địa chỉ email")
    .email("Địa chỉ email không hợp lệ"),
  password: z
    .string()
    .min(6, "Mật khẩu phải chứa ít nhất 6 ký tự"),
  rememberMe: z.boolean().optional(),
});

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .min(2, "Họ và tên phải có ít nhất 2 ký tự")
      .max(100, "Họ và tên không được vượt quá 100 ký tự"),
    email: z
      .string()
      .min(1, "Vui lòng nhập địa chỉ email")
      .email("Địa chỉ email không hợp lệ"),
    targetScore: z.preprocess(
      (val) => (val === "" || val === undefined ? undefined : Number(val)),
      z
        .number({ invalid_type_error: "Vui lòng chọn hoặc nhập điểm hợp lệ" })
        .min(10, "Mục tiêu tối thiểu là 10 điểm")
        .max(990, "Mục tiêu tối đa là 990 điểm")
        .optional()
    ),
    password: z
      .string()
      .min(8, "Mật khẩu phải chứa ít nhất 8 ký tự")
      .regex(/[A-Z]/, "Mật khẩu cần ít nhất 1 chữ cái in hoa")
      .regex(/[0-9]/, "Mật khẩu cần ít nhất 1 chữ số"),
    confirmPassword: z
      .string()
      .min(1, "Vui lòng xác nhận lại mật khẩu"),
    acceptTerms: z.literal(true, {
      errorMap: () => ({
        message: "Bạn cần đồng ý với Điều khoản dịch vụ và Chính sách bảo mật",
      }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu xác nhận không trùng khớp",
    path: ["confirmPassword"],
  });

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
