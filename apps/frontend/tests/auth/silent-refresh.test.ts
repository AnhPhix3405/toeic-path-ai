import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import { apiClient } from "@/services/api-client";
import { useAuthStore } from "@/stores/auth.store";

describe("apiClient Silent Refresh Mutex Queue", () => {
  beforeEach(() => {
    useAuthStore.getState().setAuth(
      {
        id: "user-1",
        email: "test@toeicpath.ai",
        fullName: "Test User",
        role: "student",
        createdAt: "2026-10-06T00:00:00.000Z",
      },
      "initial-expired-token"
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("triggers silent refresh and updates auth store token on 401", async () => {
    const newAccessToken = "refreshed-jwt-token-789";

    // Mock global axios.post for the /auth/refresh endpoint
    vi.spyOn(axios, "post").mockImplementation(async (url: string) => {
      if (url.includes("/auth/refresh")) {
        return {
          data: {
            data: {
              accessToken: newAccessToken,
            },
          },
          status: 200,
        } as AxiosResponse;
      }
      return { data: {}, status: 200 } as AxiosResponse;
    });

    let callCount = 0;
    apiClient.raw.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
      callCount++;
      if (callCount === 1) {
        const err = new AxiosError(
          "Request failed with status code 401",
          "ERR_BAD_REQUEST",
          config,
          {},
          {
            status: 401,
            data: { message: "Token expired" },
            statusText: "Unauthorized",
            headers: {},
            config,
          } as AxiosResponse
        );
        throw err;
      }
      return {
        data: { success: true, data: { progress: 85 } },
        status: 200,
        statusText: "OK",
        headers: {},
        config,
      };
    };

    const result = await apiClient.get<{ progress: number }>("/student/progress");

    expect(result.data.progress).toBe(85);
    expect(useAuthStore.getState().token).toBe(newAccessToken);
  });

  it("clears auth store when refresh token fails", async () => {
    vi.spyOn(axios, "post").mockImplementation(async (url: string) => {
      if (url.includes("/auth/refresh")) {
        const refreshErr = new AxiosError(
          "Refresh token invalid",
          "ERR_BAD_REQUEST",
          undefined,
          undefined,
          {
            status: 401,
            data: { message: "Refresh token expired" },
            statusText: "Unauthorized",
            headers: {},
            config: {} as InternalAxiosRequestConfig,
          } as AxiosResponse
        );
        throw refreshErr;
      }
      return { data: {}, status: 200 } as AxiosResponse;
    });

    apiClient.raw.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
      const err = new AxiosError(
        "Request failed with status code 401",
        "ERR_BAD_REQUEST",
        config,
        {},
        {
          status: 401,
          data: { message: "Unauthorized" },
          statusText: "Unauthorized",
          headers: {},
          config,
        } as AxiosResponse
      );
      throw err;
    };

    await expect(apiClient.get("/student/results")).rejects.toThrow();

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });
});
