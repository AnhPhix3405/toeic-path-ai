"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { profileService } from "@/services/profile.service";
import { parseApiError } from "@/services/api-client";
import { useAuthStore } from "@/stores/auth.store";
import type { ProfileResponse, UpdateMyProfileDto } from "@/types/api";

export const PROFILE_QUERY_KEY = ["profile", "me"] as const;

/**
 * Đồng bộ dữ liệu hồ sơ mới nhất sang Zustand Auth Store để Header & Avatar trên Navbar phản ánh ngay lập tức
 */
export function syncProfileToAuthStore(profileRes: ProfileResponse) {
  const currentAuthUser = useAuthStore.getState().user;
  if (!currentAuthUser) return;

  useAuthStore.getState().setUser({
    ...currentAuthUser,
    fullName: profileRes.profile.fullName || currentAuthUser.fullName,
    avatarUrl: profileRes.profile.avatarUrl ?? undefined,
    role: profileRes.role || currentAuthUser.role,
  });
}

/**
 * Hook truy vấn thông tin hồ sơ của người dùng hiện tại
 */
export function useProfile() {
  return useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: async () => {
      const data = await profileService.getMyProfile();
      syncProfileToAuthStore(data);
      return data;
    },
    staleTime: 60 * 1000,
  });
}

/**
 * Hook cập nhật thông tin cá nhân (Họ tên, Ngày sinh, Giới tính, Tiểu sử)
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: UpdateMyProfileDto) => profileService.updateMyProfile(dto),
    onSuccess: (data) => {
      queryClient.setQueryData(PROFILE_QUERY_KEY, data);
      syncProfileToAuthStore(data);
      toast.success("Cập nhật hồ sơ thành công!", {
        description: "Thông tin cá nhân của bạn đã được cập nhật.",
      });
    },
    onError: (error) => {
      const parsed = parseApiError(error);
      toast.error("Không thể cập nhật hồ sơ", {
        description: parsed.message,
      });
    },
  });
}

/**
 * Hook tải lên và thay đổi ảnh đại diện
 */
export function useUploadAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => profileService.uploadAvatar(file),
    onSuccess: (data) => {
      queryClient.setQueryData(PROFILE_QUERY_KEY, data);
      syncProfileToAuthStore(data);
      toast.success("Tải lên ảnh đại diện thành công!");
    },
    onError: (error) => {
      const parsed = parseApiError(error);
      toast.error("Tải ảnh đại diện thất bại", {
        description: parsed.message,
      });
    },
  });
}

/**
 * Hook xóa ảnh đại diện (khôi phục avatar mặc định)
 */
export function useDeleteAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => profileService.deleteAvatar(),
    onSuccess: (data) => {
      queryClient.setQueryData(PROFILE_QUERY_KEY, data);
      syncProfileToAuthStore(data);
      toast.success("Đã xóa ảnh đại diện", {
        description: "Ảnh đại diện đã trở về trạng thái ban đầu.",
      });
    },
    onError: (error) => {
      const parsed = parseApiError(error);
      toast.error("Không thể xóa ảnh đại diện", {
        description: parsed.message,
      });
    },
  });
}
