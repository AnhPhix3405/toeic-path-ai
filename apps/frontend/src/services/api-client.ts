import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { ApiError, ApiResponse } from "@/types/api";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

/**
 * Creates and configures the Axios instance for TOEIC Path AI
 */
const axiosInstance: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Request Interceptor: Attach bearer token if stored
axiosInstance.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("accessToken");
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Standardize API responses & errors
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    const apiError = parseApiError(error);
    return Promise.reject(apiError);
  }
);

/**
 * Normalizes any unknown error or Axios error into a standardized ApiError object
 */
export function parseApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data as Record<string, unknown> | undefined;
    const statusCode = error.response?.status || (error.code === "ECONNABORTED" ? 408 : 500);

    let message = "Đã xảy ra lỗi không xác định từ hệ thống.";

    if (responseData?.message) {
      if (Array.isArray(responseData.message)) {
        message = responseData.message.join(", ");
      } else if (typeof responseData.message === "string") {
        message = responseData.message;
      }
    } else if (error.message) {
      if (error.code === "ERR_NETWORK") {
        message = "Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại đường truyền.";
      } else if (error.code === "ECONNABORTED") {
        message = "Yêu cầu xử lý quá thời gian quy định (Timeout).";
      } else {
        message = error.message;
      }
    }

    return {
      message,
      statusCode,
      errorCode: (responseData?.errorCode as string) || error.code || "API_ERROR",
      details: responseData?.details || responseData?.error || undefined,
      timestamp: (responseData?.timestamp as string) || new Date().toISOString(),
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      statusCode: 500,
      errorCode: "CLIENT_ERROR",
      timestamp: new Date().toISOString(),
    };
  }

  return {
    message: typeof error === "string" ? error : "Lỗi hệ thống không xác định.",
    statusCode: 500,
    errorCode: "UNKNOWN_ERROR",
    timestamp: new Date().toISOString(),
  };
}

/**
 * Type-safe HTTP Client Methods
 */
export const apiClient = {
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await axiosInstance.get<ApiResponse<T>>(url, config);
    return response.data;
  },

  async post<T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await axiosInstance.post<ApiResponse<T>>(url, data, config);
    return response.data;
  },

  async put<T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await axiosInstance.put<ApiResponse<T>>(url, data, config);
    return response.data;
  },

  async patch<T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await axiosInstance.patch<ApiResponse<T>>(url, data, config);
    return response.data;
  },

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await axiosInstance.delete<ApiResponse<T>>(url, config);
    return response.data;
  },

  raw: axiosInstance,
};

export default apiClient;
