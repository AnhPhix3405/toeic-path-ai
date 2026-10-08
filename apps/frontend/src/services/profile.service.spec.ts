import { describe, it, expect, vi, beforeEach } from "vitest";
import { profileService } from "./profile.service";
import { apiClient } from "./api-client";
import type { ProfileResponse, UpdateMyProfileDto } from "@/types/api";

vi.mock("./api-client", () => ({
  apiClient: {
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("profileService", () => {
  const mockProfile: ProfileResponse = {
    userId: "user-123",
    email: "student@toeicpath.ai",
    role: "student",
    profile: {
      fullName: "Nguyen Van A",
      avatarUrl: "https://storage.toeicpath.com/avatars/user-123.webp",
      birthday: "2000-01-15",
      gender: "male",
      bio: "Mục tiêu TOEIC 850+",
    },
    updatedAt: "2026-10-08T12:00:00.000Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getMyProfile", () => {
    it("fetches current user profile successfully (flat response)", async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce(mockProfile as any);

      const result = await profileService.getMyProfile();
      expect(apiClient.get).toHaveBeenCalledWith("/profile/me");
      expect(result).toEqual(mockProfile);
    });

    it("unwraps data property if response is wrapped in { data: ... }", async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: mockProfile,
        success: true,
      } as any);

      const result = await profileService.getMyProfile();
      expect(result).toEqual(mockProfile);
    });
  });

  describe("updateMyProfile", () => {
    it("sends patch request with DTO and returns updated profile", async () => {
      const updateDto: UpdateMyProfileDto = {
        fullName: "Nguyen Van B",
        bio: "Updated bio",
      };
      const updatedProfile = {
        ...mockProfile,
        profile: { ...mockProfile.profile, ...updateDto },
      };

      vi.mocked(apiClient.patch).mockResolvedValueOnce(updatedProfile as any);

      const result = await profileService.updateMyProfile(updateDto);
      expect(apiClient.patch).toHaveBeenCalledWith("/profile/me", updateDto);
      expect(result).toEqual(updatedProfile);
    });
  });

  describe("uploadAvatar", () => {
    it("sends multipart/form-data with avatar field", async () => {
      const file = new File(["dummy content"], "avatar.png", { type: "image/png" });
      const updatedProfileWithAvatar = {
        ...mockProfile,
        profile: { ...mockProfile.profile, avatarUrl: "https://storage.toeicpath.com/avatars/new.webp" },
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce(updatedProfileWithAvatar as any);

      const result = await profileService.uploadAvatar(file);
      expect(apiClient.post).toHaveBeenCalledWith(
        "/profile/me/avatar",
        expect.any(FormData),
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      expect(result).toEqual(updatedProfileWithAvatar);
    });
  });

  describe("deleteAvatar", () => {
    it("sends delete request to /profile/me/avatar", async () => {
      const updatedProfileNoAvatar = {
        ...mockProfile,
        profile: { ...mockProfile.profile, avatarUrl: null },
      };

      vi.mocked(apiClient.delete).mockResolvedValueOnce(updatedProfileNoAvatar as any);

      const result = await profileService.deleteAvatar();
      expect(apiClient.delete).toHaveBeenCalledWith("/profile/me/avatar");
      expect(result).toEqual(updatedProfileNoAvatar);
    });
  });
});
