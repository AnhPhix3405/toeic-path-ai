import * as React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { checkHealth, useApiHealth } from "@/services/health.service";
import { apiClient } from "@/services/api-client";
import type { HealthStatusResponse, ApiResponse } from "@/types/api";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  function TestQueryWrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  TestQueryWrapper.displayName = "TestQueryWrapper";

  return TestQueryWrapper;
}

describe("Health Service & useApiHealth Hook", () => {
  const mockHealthData: HealthStatusResponse = {
    status: "ok",
    uptime: 12345,
    version: "1.0.0",
    timestamp: "2026-10-06T12:00:00.000Z",
    services: {
      database: "connected",
      redis: "connected",
    },
  };

  it("checkHealth calls apiClient.get and returns response data", async () => {
    const apiResponse: ApiResponse<HealthStatusResponse> = {
      success: true,
      data: mockHealthData,
      timestamp: "2026-10-06T12:00:00.000Z",
      statusCode: 200,
    };

    vi.spyOn(apiClient, "get").mockResolvedValueOnce(apiResponse);

    const result = await checkHealth();
    expect(result).toEqual(mockHealthData);
    expect(apiClient.get).toHaveBeenCalledWith("/health");
  });

  it("useApiHealth hook fetches and returns health data successfully", async () => {
    const apiResponse: ApiResponse<HealthStatusResponse> = {
      success: true,
      data: mockHealthData,
      timestamp: "2026-10-06T12:00:00.000Z",
      statusCode: 200,
    };

    vi.spyOn(apiClient, "get").mockResolvedValueOnce(apiResponse);

    const { result } = renderHook(() => useApiHealth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockHealthData);
    expect(result.current.data?.status).toBe("ok");
    expect(result.current.data?.version).toBe("1.0.0");
  });
});
