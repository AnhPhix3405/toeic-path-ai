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
      .trim()
      .min(1, "Vui lòng nhập họ và tên")
      .max(150, "Họ và tên không được vượt quá 150 ký tự"),
    email: z
      .string()
      .trim()
      .min(1, "Vui lòng nhập địa chỉ email")
      .email("Địa chỉ email không hợp lệ")
      .max(255, "Email không được vượt quá 255 ký tự"),
    password: z
      .string()
      .min(12, "Mật khẩu phải chứa ít nhất 12 ký tự")
      .max(72, "Mật khẩu không được vượt quá 72 ký tự")
      .regex(/[a-z]/, "Mật khẩu cần ít nhất 1 chữ cái in thường")
      .regex(/[A-Z]/, "Mật khẩu cần ít nhất 1 chữ cái in hoa")
      .regex(/[0-9]/, "Mật khẩu cần ít nhất 1 chữ số")
      .regex(/[^A-Za-z\d]/, "Mật khẩu cần ít nhất 1 ký tự đặc biệt (!@#$%^&*...)"),
    confirmPassword: z
      .string()
      .min(1, "Vui lòng xác nhận lại mật khẩu"),
    acceptTerms: z
      .boolean()
      .refine((val) => val === true, {
        message: "Bạn cần đồng ý với Điều khoản dịch vụ và Chính sách bảo mật",
      }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu xác nhận không trùng khớp",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập địa chỉ email")
    .email("Địa chỉ email không hợp lệ")
    .max(255, "Email không được vượt quá 255 ký tự"),
});

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(12, "Mật khẩu phải chứa ít nhất 12 ký tự")
      .max(72, "Mật khẩu không được vượt quá 72 ký tự")
      .regex(/[a-z]/, "Mật khẩu cần ít nhất 1 chữ cái in thường")
      .regex(/[A-Z]/, "Mật khẩu cần ít nhất 1 chữ cái in hoa")
      .regex(/[0-9]/, "Mật khẩu cần ít nhất 1 chữ số")
      .regex(/[^A-Za-z\d]/, "Mật khẩu cần ít nhất 1 ký tự đặc biệt (!@#$%^&*...)"),
    confirmPassword: z
      .string()
      .min(1, "Vui lòng xác nhận lại mật khẩu"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu xác nhận không trùng khớp",
    path: ["confirmPassword"],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Vui lòng nhập mật khẩu hiện tại")
      .max(72, "Mật khẩu hiện tại không được vượt quá 72 ký tự"),
    newPassword: z
      .string()
      .min(12, "Mật khẩu mới phải chứa ít nhất 12 ký tự")
      .max(72, "Mật khẩu mới không được vượt quá 72 ký tự")
      .regex(/[a-z]/, "Mật khẩu mới cần ít nhất 1 chữ cái in thường")
      .regex(/[A-Z]/, "Mật khẩu mới cần ít nhất 1 chữ cái in hoa")
      .regex(/[0-9]/, "Mật khẩu mới cần ít nhất 1 chữ số")
      .regex(/[^A-Za-z\d]/, "Mật khẩu mới cần ít nhất 1 ký tự đặc biệt (!@#$%^&*...)"),
    confirmNewPassword: z
      .string()
      .min(1, "Vui lòng xác nhận lại mật khẩu mới"),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Mật khẩu xác nhận không trùng khớp",
    path: ["confirmNewPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "Mật khẩu mới không được trùng với mật khẩu hiện tại",
    path: ["newPassword"],
  });

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
