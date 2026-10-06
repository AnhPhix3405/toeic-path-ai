import { describe, it, expect, vi, beforeEach } from "vitest";
import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import { apiClient, parseApiError, isApiError } from "@/services/api-client";

describe("api-client & parseApiError", () => {
  describe("isApiError type guard", () => {
    it("returns true for valid ApiError objects", () => {
      const validError = {
        statusCode: 400,
        message: "Dữ liệu không hợp lệ",
        errorCode: "VALIDATION_FAILED",
      };
      expect(isApiError(validError)).toBe(true);
    });

    it("returns false for non-ApiError objects", () => {
      expect(isApiError(null)).toBe(false);
      expect(isApiError(undefined)).toBe(false);
      expect(isApiError("Error string")).toBe(false);
      expect(isApiError(new Error("Generic"))).toBe(false);
      expect(isApiError({ message: "No status code" })).toBe(false);
    });
  });

  describe("parseApiError helper", () => {
    it("parses 400 validation error correctly", () => {
      const axiosError = new AxiosError(
        "Request failed with status code 400",
        "ERR_BAD_REQUEST",
        undefined,
        undefined,
        {
          status: 400,
          data: {
            success: false,
            message: "Email đã được đăng ký",
            errorCode: "EMAIL_EXISTS",
          },
        } as AxiosResponse
      );

      const parsed = parseApiError(axiosError);
      expect(parsed.statusCode).toBe(400);
      expect(parsed.message).toBe("Email đã được đăng ký");
      expect(parsed.errorCode).toBe("EMAIL_EXISTS");
    });

    it("normalizes default messages for 401 Unauthorized", () => {
      const axiosError = new AxiosError(
        "Unauthorized",
        "ERR_BAD_REQUEST",
        undefined,
        undefined,
        {
          status: 401,
          data: {},
        } as AxiosResponse
      );

      const parsed = parseApiError(axiosError);
      expect(parsed.statusCode).toBe(401);
      expect(parsed.message).toContain("Phiên đăng nhập đã hết hạn");
    });

    it("normalizes default messages for 403 Forbidden", () => {
      const axiosError = new AxiosError(
        "Forbidden",
        "ERR_BAD_REQUEST",
        undefined,
        undefined,
        {
          status: 403,
          data: {},
        } as AxiosResponse
      );

      const parsed = parseApiError(axiosError);
      expect(parsed.statusCode).toBe(403);
      expect(parsed.message).toContain("không có quyền truy cập");
    });

    it("normalizes default messages for 404 Not Found", () => {
      const axiosError = new AxiosError(
        "Not Found",
        "ERR_BAD_REQUEST",
        undefined,
        undefined,
        {
          status: 404,
          data: {},
        } as AxiosResponse
      );

      const parsed = parseApiError(axiosError);
      expect(parsed.statusCode).toBe(404);
      expect(parsed.message).toContain("Không tìm thấy tài nguyên");
    });

    it("handles Network connection errors", () => {
      const networkError = new AxiosError(
        "Network Error",
        "ERR_NETWORK"
      );

      const parsed = parseApiError(networkError);
      expect(parsed.message).toContain("Không thể kết nối đến máy chủ");
    });

    it("handles standard Error instances", () => {
      const standardError = new Error("Custom JS crash");
      const parsed = parseApiError(standardError);
      expect(parsed.statusCode).toBe(500);
      expect(parsed.message).toBe("Custom JS crash");
    });
  });

  describe("apiClient HTTP methods", () => {
    it("calls apiClient.get and unwraps response data", async () => {
      const mockData = { success: true, data: { status: "ok" } };
      vi.spyOn(apiClient.raw, "get").mockResolvedValueOnce({
        data: mockData,
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as InternalAxiosRequestConfig,
      });

      const result = await apiClient.get<{ status: string }>("/health");
      expect(result).toEqual(mockData);
    });

    it("calls apiClient.post and unwraps response data", async () => {
      const payload = { email: "test@toeicpath.ai", password: "Password123" };
      const mockData = { success: true, data: { token: "abc-token" } };

      vi.spyOn(apiClient.raw, "post").mockResolvedValueOnce({
        data: mockData,
        status: 201,
        statusText: "Created",
        headers: {},
        config: {} as InternalAxiosRequestConfig,
      });

      const result = await apiClient.post("/auth/login", payload);
      expect(result).toEqual(mockData);
    });
  });
});
