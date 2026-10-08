import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ProfilePage from "@/app/profile/page";
import { useProfile, useUploadAvatar, useDeleteAvatar, useUpdateProfile } from "@/hooks/use-profile";
import { useAuthStore } from "@/stores/auth.store";
import type { ProfileResponse } from "@/types/api";

vi.mock("@/hooks/use-profile", () => ({
  useProfile: vi.fn(),
  useUploadAvatar: vi.fn(),
  useDeleteAvatar: vi.fn(),
  useUpdateProfile: vi.fn(),
}));

describe("ProfilePage Integration Tests", () => {
  const mockRefetch = vi.fn();

  const mockProfileData: ProfileResponse = {
    userId: "user-uuid-123",
    email: "student@toeicpath.ai",
    role: "student",
    profile: {
      fullName: "Nguyen Van A",
      avatarUrl: "https://storage.toeicpath.com/avatars/user-123.webp",
      birthday: "2000-01-15",
      gender: "male",
      bio: "Mục tiêu TOEIC 850+ trong 3 tháng tới.",
    },
    updatedAt: "2026-10-08T12:00:00.000Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useUploadAvatar).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);

    vi.mocked(useDeleteAvatar).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);

    vi.mocked(useUpdateProfile).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);

    useAuthStore.setState({
      user: {
        id: "user-uuid-123",
        email: "student@toeicpath.ai",
        fullName: "Nguyen Van A",
        role: "student",
        createdAt: "2026-01-01",
      },
      token: "fake-jwt",
      role: "student",
      isAuthenticated: true,
      isLoading: false,
      isInitialized: true,
    });
  });

  it("renders loading skeleton when query is in loading state", () => {
    vi.mocked(useProfile).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: mockRefetch,
    } as any);

    const { container } = render(<ProfilePage />);

    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders error state with retry button when query fails", async () => {
    const user = userEvent.setup();
    vi.mocked(useProfile).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("Network connection lost"),
      refetch: mockRefetch,
    } as any);

    render(<ProfilePage />);

    expect(screen.getByText("Không thể tải thông tin hồ sơ")).toBeInTheDocument();
    expect(screen.getByText("Network connection lost")).toBeInTheDocument();

    const retryBtn = screen.getByRole("button", { name: /Thử lại/i });
    await user.click(retryBtn);

    expect(mockRefetch).toHaveBeenCalled();
  });

  it("renders complete profile dashboard when data is successfully fetched", () => {
    vi.mocked(useProfile).mockReturnValue({
      data: mockProfileData,
      isLoading: false,
      isError: false,
      error: null,
      refetch: mockRefetch,
    } as any);

    render(<ProfilePage />);

    // Header & Hero
    expect(screen.getAllByText("Nguyen Van A").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Học viên").length).toBeGreaterThan(0);

    // Avatar Section
    expect(screen.getByText("Ảnh Đại Diện")).toBeInTheDocument();
    expect(screen.getByText("Tải ảnh mới")).toBeInTheDocument();

    // Form Section
    expect(screen.getByText("Thông Tin Cá Nhân")).toBeInTheDocument();
    expect(screen.getByLabelText(/Họ và tên/i)).toHaveValue("Nguyen Van A");
  });
});
