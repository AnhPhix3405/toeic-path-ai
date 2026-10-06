import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import TermsOfServicePage from "@/app/(public)/terms/page";
import PrivacyPolicyPage from "@/app/(public)/privacy/page";

describe("Legal & Compliance Pages", () => {
  describe("TermsOfServicePage (/terms)", () => {
    it("renders heading, introduction and main legal sections", () => {
      render(<TermsOfServicePage />);

      expect(
        screen.getByRole("heading", { name: "Điều Khoản Dịch Vụ" })
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Chào mừng bạn đến với/i)
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: /1\. Giới thiệu & Phạm vi áp dụng/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: /2\. Tài khoản & Trách nhiệm người dùng/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /Quay lại trang Đăng ký/i })
      ).toHaveAttribute("href", "/register");
    });
  });

  describe("PrivacyPolicyPage (/privacy)", () => {
    it("renders heading, data collection and security sections", () => {
      render(<PrivacyPolicyPage />);

      expect(
        screen.getByRole("heading", { name: "Chính Sách Bảo Mật" })
      ).toBeInTheDocument();
      expect(
        screen.getByText(/chúng tôi tôn trọng và cam kết bảo vệ/i)
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: /1\. Thông tin chúng tôi thu thập/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: /4\. Cơ chế bảo mật & Lưu trữ/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /Quay lại trang Đăng ký/i })
      ).toHaveAttribute("href", "/register");
    });
  });
});
