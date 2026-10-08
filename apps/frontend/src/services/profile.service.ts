import { apiClient } from "./api-client";
import type { ProfileResponse, UpdateMyProfileDto } from "@/types/api";

/**
 * Unwrap profile response helper that handles raw DTO or wrapped ApiResponse<{ data }>
 */
function unwrapProfileResponse(raw: unknown): ProfileResponse {
  if (raw && typeof raw === "object" && "data" in raw && (raw as { data?: unknown }).data) {
    return (raw as { data: ProfileResponse }).data;
  }
  return raw as ProfileResponse;
}

export const profileService = {
  /**
   * Lấy thông tin chi tiết hồ sơ cá nhân của người dùng hiện tại
   * GET /api/v1/profile/me
   */
  async getMyProfile(): Promise<ProfileResponse> {
    const raw = (await apiClient.get<unknown>("/profile/me")) as unknown;
    return unwrapProfileResponse(raw);
  },

  /**
   * Cập nhật thông tin cá nhân (Họ tên, Ngày sinh, Giới tính, Tiểu sử)
   * PATCH /api/v1/profile/me
   */
  async updateMyProfile(dto: UpdateMyProfileDto): Promise<ProfileResponse> {
    const raw = (await apiClient.patch<unknown>("/profile/me", dto)) as unknown;
    return unwrapProfileResponse(raw);
  },

  /**
   * Tải lên ảnh đại diện mới (Multipart FormData)
   * POST /api/v1/profile/me/avatar
   */
  async uploadAvatar(file: File): Promise<ProfileResponse> {
    const formData = new FormData();
    formData.append("avatar", file);

    const raw = (await apiClient.post<unknown>("/profile/me/avatar", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })) as unknown;
    return unwrapProfileResponse(raw);
  },

  /**
   * Xóa ảnh đại diện hiện tại
   * DELETE /api/v1/profile/me/avatar
   */
  async deleteAvatar(): Promise<ProfileResponse> {
    const raw = (await apiClient.delete<unknown>("/profile/me/avatar")) as unknown;
    return unwrapProfileResponse(raw);
  },
};

export default profileService;
