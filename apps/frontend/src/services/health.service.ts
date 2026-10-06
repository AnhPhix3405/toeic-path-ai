import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "./api-client";
import type { HealthStatusResponse, ApiError } from "@/types/api";

export const HEALTH_QUERY_KEY = ["api-health"] as const;

/**
 * Fetch backend API health status directly
 */
export async function checkHealth(): Promise<HealthStatusResponse> {
  const response = await apiClient.get<HealthStatusResponse | { data: HealthStatusResponse }>("/health");

  if (response && typeof response === "object") {
    if ("data" in response && response.data && typeof response.data === "object") {
      return response.data as HealthStatusResponse;
    }
    return response as HealthStatusResponse;
  }

  return {
    status: "ok",
    uptime: 0,
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  };
}

/**
 * Hook to query backend API health status with TanStack Query
 */
export function useApiHealth(
  options?: Omit<
    UseQueryOptions<HealthStatusResponse, ApiError, HealthStatusResponse, typeof HEALTH_QUERY_KEY>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: HEALTH_QUERY_KEY,
    queryFn: checkHealth,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    ...options,
  });
}
