import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProfileForm } from "@/features/profile/components/profile-form";
import { useUpdateProfile } from "@/hooks/use-profile";
import type { ProfileResponse } from "@/types/api";

vi.mock("@/hooks/use-profile", () => ({
  useUpdateProfile: vi.fn(),
}));

describe("ProfileForm Component", () => {
  const mockMutateAsync = vi.fn();

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
    vi.mocked(useUpdateProfile).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as any);
  });

  it("renders form fields initialized with profile data", () => {
    render(<ProfileForm profileData={mockProfileData} />);

    expect(screen.getByLabelText(/Họ và tên/i)).toHaveValue("Nguyen Van A");
    expect(screen.getByLabelText(/Ngày sinh/i)).toHaveValue("2000-01-15");
    expect(screen.getByLabelText(/Tiểu sử & Mục tiêu/i)).toHaveValue(
      "Mục tiêu TOEIC 850+ trong 3 tháng tới."
    );
    expect(screen.getByText("student@toeicpath.ai")).toBeInTheDocument();
    expect(screen.getByText("user-uuid-123")).toBeInTheDocument();
  });

  it("disables Save and Cancel buttons when form is not dirty", () => {
    render(<ProfileForm profileData={mockProfileData} />);

    expect(screen.getByRole("button", { name: /Lưu thay đổi/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Hủy bỏ/i })).toBeDisabled();
    expect(screen.getByText("Dữ liệu đã được lưu")).toBeInTheDocument();
  });

  it("enables Save button when input changes (dirty state) and resets on Cancel", async () => {
    const user = userEvent.setup();
    render(<ProfileForm profileData={mockProfileData} />);

    const fullNameInput = screen.getByLabelText(/Họ và tên/i);
    await user.clear(fullNameInput);
    await user.type(fullNameInput, "Nguyen Van Updated");

    expect(screen.getByRole("button", { name: /Lưu thay đổi/i })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /Hủy bỏ/i })).not.toBeDisabled();
    expect(screen.getByText("Có thay đổi chưa lưu")).toBeInTheDocument();

    // Click Cancel
    await user.click(screen.getByRole("button", { name: /Hủy bỏ/i }));

    expect(fullNameInput).toHaveValue("Nguyen Van A");
    expect(screen.getByRole("button", { name: /Lưu thay đổi/i })).toBeDisabled();
  });

  it("submits updated profile data successfully", async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValueOnce({
      ...mockProfileData,
      profile: {
        ...mockProfileData.profile,
        fullName: "Nguyen Van B",
      },
    });

    render(<ProfileForm profileData={mockProfileData} />);

    const fullNameInput = screen.getByLabelText(/Họ và tên/i);
    await user.clear(fullNameInput);
    await user.type(fullNameInput, "Nguyen Van B");

    const saveBtn = screen.getByRole("button", { name: /Lưu thay đổi/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        fullName: "Nguyen Van B",
        birthday: "2000-01-15",
        gender: "male",
        bio: "Mục tiêu TOEIC 850+ trong 3 tháng tới.",
      });
    });
  });

  it("displays validation error when fullName is empty upon submission", async () => {
    const user = userEvent.setup();
    render(<ProfileForm profileData={mockProfileData} />);

    const fullNameInput = screen.getByLabelText(/Họ và tên/i);
    await user.clear(fullNameInput);

    const saveBtn = screen.getByRole("button", { name: /Lưu thay đổi/i });
    await user.click(saveBtn);

    expect(await screen.findByText("Họ và tên không được để trống")).toBeInTheDocument();
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it("displays server error alert when submission fails", async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockRejectedValueOnce({
      statusCode: 400,
      message: "Ngày sinh không hợp lệ.",
    });

    render(<ProfileForm profileData={mockProfileData} />);

    const fullNameInput = screen.getByLabelText(/Họ và tên/i);
    await user.clear(fullNameInput);
    await user.type(fullNameInput, "Nguyen Van Error");

    const saveBtn = screen.getByRole("button", { name: /Lưu thay đổi/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Ngày sinh không hợp lệ.");
    });
  });
});
