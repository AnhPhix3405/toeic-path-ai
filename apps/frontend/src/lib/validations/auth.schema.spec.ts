import { describe, it, expect } from "vitest";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  loginSchema,
  registerSchema,
  changePasswordSchema,
} from "./auth.schema";

describe("Auth Validation Schemas", () => {
  describe("forgotPasswordSchema", () => {
    it("accepts valid email addresses", () => {
      const valid = forgotPasswordSchema.safeParse({
        email: "student@toeicpath.ai",
      });
      expect(valid.success).toBe(true);
    });

    it("rejects empty or whitespace-only email", () => {
      const empty = forgotPasswordSchema.safeParse({ email: "" });
      expect(empty.success).toBe(false);
      if (!empty.success) {
        expect(empty.error.issues[0].message).toContain("Vui lòng nhập địa chỉ email");
      }
    });

    it("rejects invalid email formats", () => {
      const invalid = forgotPasswordSchema.safeParse({ email: "invalid-email" });
      expect(invalid.success).toBe(false);
      if (!invalid.success) {
        expect(invalid.error.issues[0].message).toContain("Địa chỉ email không hợp lệ");
      }
    });
  });

  describe("resetPasswordSchema", () => {
    it("accepts strong password meeting all criteria with matching confirmPassword", () => {
      const result = resetPasswordSchema.safeParse({
        password: "StrongPassword123!",
        confirmPassword: "StrongPassword123!",
      });
      expect(result.success).toBe(true);
    });

    it("rejects passwords shorter than 12 characters", () => {
      const result = resetPasswordSchema.safeParse({
        password: "Pass123!",
        confirmPassword: "Pass123!",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.message.includes("12 ký tự"))).toBe(true);
      }
    });

    it("rejects passwords missing uppercase, lowercase, number, or special char", () => {
      const noUpper = resetPasswordSchema.safeParse({
        password: "password123456!",
        confirmPassword: "password123456!",
      });
      expect(noUpper.success).toBe(false);

      const noSpecial = resetPasswordSchema.safeParse({
        password: "Password123456",
        confirmPassword: "Password123456",
      });
      expect(noSpecial.success).toBe(false);
    });

    it("rejects when confirmPassword does not match password", () => {
      const result = resetPasswordSchema.safeParse({
        password: "StrongPassword123!",
        confirmPassword: "DifferentPassword123!",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.message.includes("không trùng khớp"))).toBe(true);
      }
    });
  });

  describe("changePasswordSchema", () => {
    it("accepts valid change password payload meeting all complexity requirements", () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: "OldPassword123!",
        newPassword: "NewSecurePassword456!@",
        confirmNewPassword: "NewSecurePassword456!@",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty currentPassword", () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: "",
        newPassword: "NewSecurePassword456!@",
        confirmNewPassword: "NewSecurePassword456!@",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.message.includes("mật khẩu hiện tại"))).toBe(true);
      }
    });

    it("rejects newPassword shorter than 12 characters", () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: "OldPassword123!",
        newPassword: "Short1!",
        confirmNewPassword: "Short1!",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.message.includes("12 ký tự"))).toBe(true);
      }
    });

    it("rejects newPassword missing complexity requirements", () => {
      const noSpecial = changePasswordSchema.safeParse({
        currentPassword: "OldPassword123!",
        newPassword: "NewPassword123456",
        confirmNewPassword: "NewPassword123456",
      });
      expect(noSpecial.success).toBe(false);

      const noDigit = changePasswordSchema.safeParse({
        currentPassword: "OldPassword123!",
        newPassword: "NewPasswordNoDigit!",
        confirmNewPassword: "NewPasswordNoDigit!",
      });
      expect(noDigit.success).toBe(false);
    });

    it("rejects when confirmNewPassword does not match newPassword", () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: "OldPassword123!",
        newPassword: "NewSecurePassword456!@",
        confirmNewPassword: "DifferentPassword789!@",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.message.includes("không trùng khớp"))).toBe(true);
      }
    });

    it("rejects when newPassword is the same as currentPassword", () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: "SameSecurePassword123!@",
        newPassword: "SameSecurePassword123!@",
        confirmNewPassword: "SameSecurePassword123!@",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.message.includes("không được trùng"))).toBe(true);
      }
    });
  });
});
