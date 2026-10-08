import { describe, it, expect } from "vitest";
import { updateProfileSchema } from "./profile.schema";

describe("Profile Validation Schemas", () => {
  describe("updateProfileSchema", () => {
    it("accepts valid full profile data", () => {
      const valid = updateProfileSchema.safeParse({
        fullName: "Nguyen Van A",
        birthday: "2000-01-15",
        gender: "male",
        bio: "Mục tiêu TOEIC 850+ trong 3 tháng tới.",
      });
      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.fullName).toBe("Nguyen Van A");
        expect(valid.data.birthday).toBe("2000-01-15");
        expect(valid.data.gender).toBe("male");
        expect(valid.data.bio).toBe("Mục tiêu TOEIC 850+ trong 3 tháng tới.");
      }
    });

    it("accepts nullable and optional fields", () => {
      const valid = updateProfileSchema.safeParse({
        fullName: "Tran Thi B",
        birthday: null,
        gender: null,
        bio: null,
      });
      expect(valid.success).toBe(true);
    });

    it("accepts empty strings for optional fields", () => {
      const valid = updateProfileSchema.safeParse({
        fullName: "   Le Van C   ",
        birthday: "",
        gender: null,
        bio: "   ",
      });
      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.fullName).toBe("Le Van C");
      }
    });

    it("rejects empty or whitespace-only fullName", () => {
      const empty = updateProfileSchema.safeParse({
        fullName: "   ",
      });
      expect(empty.success).toBe(false);
      if (!empty.success) {
        expect(empty.error.issues.some((i) => i.message.includes("Họ và tên"))).toBe(true);
      }
    });

    it("rejects fullName exceeding 150 characters", () => {
      const tooLong = updateProfileSchema.safeParse({
        fullName: "A".repeat(151),
      });
      expect(tooLong.success).toBe(false);
      if (!tooLong.success) {
        expect(tooLong.error.issues.some((i) => i.message.includes("150 ký tự"))).toBe(true);
      }
    });

    it("rejects birthday in the future", () => {
      // Create a date in the future (e.g. tomorrow or year 2099)
      const futureDate = "2099-12-31";
      const result = updateProfileSchema.safeParse({
        fullName: "Nguyen Van A",
        birthday: futureDate,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.message.includes("tương lai"))).toBe(true);
      }
    });

    it("rejects invalid date format for birthday", () => {
      const result = updateProfileSchema.safeParse({
        fullName: "Nguyen Van A",
        birthday: "15-08-2000",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.message.includes("YYYY-MM-DD"))).toBe(true);
      }
    });

    it("rejects invalid gender value", () => {
      const result = updateProfileSchema.safeParse({
        fullName: "Nguyen Van A",
        gender: "invalid_gender",
      });
      expect(result.success).toBe(false);
    });

    it("rejects bio exceeding 500 characters", () => {
      const result = updateProfileSchema.safeParse({
        fullName: "Nguyen Van A",
        bio: "X".repeat(501),
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.message.includes("500 ký tự"))).toBe(true);
      }
    });
  });
});
