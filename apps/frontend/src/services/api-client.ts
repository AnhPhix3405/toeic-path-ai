import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { ApiError, ApiResponse } from "@/types/api";
import { useAuthStore } from "@/stores/auth.store";

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

interface FailedRequestQueueItem {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}

let isRefreshing = false;
let failedQueue: FailedRequestQueueItem[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request Interceptor: Attach bearer token from Zustand store or localStorage
axiosInstance.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const storeToken = useAuthStore.getState().token;
      const token = storeToken || localStorage.getItem("accessToken");
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Standardize responses and handle Silent Token Refresh
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;

    const url = originalRequest?.url || "";
    const isAuthEndpoint =
      url.includes("/auth/login") ||
      url.includes("/auth/register") ||
      url.includes("/auth/refresh") ||
      url.includes("/auth/logout");

    // Handle 401 Unauthorized with Silent Refresh Mutex Queue
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise<AxiosResponse>((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              if (originalRequest.headers) {
                originalRequest.headers["Authorization"] = `Bearer ${token}`;
              }
              resolve(axiosInstance(originalRequest));
            },
            reject: (err: unknown) => {
              reject(parseApiError(err));
            },
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshResponse = await axios.post<{ data: { accessToken: string } } | { accessToken: string }>(
          `${BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const responseData = refreshResponse.data as Record<string, unknown>;
        const innerData = responseData.data as Record<string, unknown> | undefined;
        const newAccessToken =
          (innerData?.accessToken as string) ||
          (responseData?.accessToken as string);

        if (newAccessToken) {
          useAuthStore.getState().setToken(newAccessToken);
          if (typeof document !== "undefined") {
            document.cookie = `auth_token=${encodeURIComponent(newAccessToken)}; path=/; max-age=604800; SameSite=Lax`;
          }

          processQueue(null, newAccessToken);

          if (originalRequest.headers) {
            originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
          }
          return axiosInstance(originalRequest);
        } else {
          throw new Error("Không thể trích xuất token mới từ phản hồi.");
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        useAuthStore.getState().clearAuth();
        const apiError = parseApiError(refreshErr);
        return Promise.reject(apiError);
      } finally {
        isRefreshing = false;
      }
    }

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
    } else if (error.code === "ERR_NETWORK") {
      message = "Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại đường truyền.";
    } else if (error.code === "ECONNABORTED") {
      message = "Yêu cầu xử lý quá thời gian quy định (Timeout).";
    } else {
      switch (statusCode) {
        case 400:
          message = "Yêu cầu không hợp lệ. Vui lòng kiểm tra lại dữ liệu.";
          break;
        case 401:
          message = "Phiên đăng nhập đã hết hạn hoặc bạn chưa đăng nhập.";
          break;
        case 403:
          message = "Bạn không có quyền truy cập vào tài nguyên này.";
          break;
        case 404:
          message = "Không tìm thấy tài nguyên yêu cầu.";
          break;
        case 422:
          message = "Dữ liệu xử lý không hợp lệ.";
          break;
        case 500:
        case 502:
        case 503:
          message = "Lỗi hệ thống máy chủ. Vui lòng thử lại sau.";
          break;
        default:
          message = error.message || "Đã xảy ra lỗi kết nối hệ thống.";
      }
    }

    return {
      message,
      statusCode,
      errorCode: (responseData?.errorCode as string) || error.code || `HTTP_${statusCode}`,
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
 * Type guard for normalized ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    "message" in error &&
    typeof (error as Record<string, unknown>).statusCode === "number" &&
    typeof (error as Record<string, unknown>).message === "string"
  );
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
