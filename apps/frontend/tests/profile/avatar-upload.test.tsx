import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AvatarUpload } from "@/features/profile/components/avatar-upload";
import { useUploadAvatar, useDeleteAvatar } from "@/hooks/use-profile";
import { toast } from "sonner";

vi.mock("@/hooks/use-profile", () => ({
  useUploadAvatar: vi.fn(),
  useDeleteAvatar: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("AvatarUpload Component", () => {
  const mockUploadMutateAsync = vi.fn();
  const mockDeleteMutateAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useUploadAvatar).mockReturnValue({
      mutateAsync: mockUploadMutateAsync,
      isPending: false,
    } as any);

    vi.mocked(useDeleteAvatar).mockReturnValue({
      mutateAsync: mockDeleteMutateAsync,
      isPending: false,
    } as any);

    // Mock URL.createObjectURL and URL.revokeObjectURL
    global.URL.createObjectURL = vi.fn(() => "blob:http://localhost/temp-preview");
    global.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders fallback initials when currentAvatarUrl is null", () => {
    render(<AvatarUpload fullName="Nguyen Van A" currentAvatarUrl={null} />);

    expect(screen.getByText("NV")).toBeInTheDocument();
    expect(screen.getByText("Tải ảnh mới")).toBeInTheDocument();
    expect(screen.queryByText("Xóa ảnh")).not.toBeInTheDocument();
  });

  it("renders delete button when currentAvatarUrl is provided", () => {
    render(
      <AvatarUpload
        fullName="Nguyen Van A"
        currentAvatarUrl="https://storage.toeicpath.com/avatars/user-1.webp"
      />
    );

    expect(screen.getByText("Xóa ảnh")).toBeInTheDocument();
  });

  it("rejects files exceeding 2MB and displays error toast", async () => {
    render(<AvatarUpload fullName="Nguyen Van A" currentAvatarUrl={null} />);

    const oversizedFile = new File([new ArrayBuffer(3 * 1024 * 1024)], "huge.jpg", {
      type: "image/jpeg",
    });

    const fileInput = screen.getByLabelText("Tải lên ảnh đại diện") as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [oversizedFile] } });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Dung lượng tệp quá lớn",
        expect.objectContaining({
          description: "Kích thước ảnh tối đa cho phép là 2MB.",
        })
      );
      expect(mockUploadMutateAsync).not.toHaveBeenCalled();
    });
  });

  it("rejects files with unsupported MIME types", async () => {
    render(<AvatarUpload fullName="Nguyen Van A" currentAvatarUrl={null} />);

    const invalidFile = new File(["dummy content"], "document.pdf", {
      type: "application/pdf",
    });

    const fileInput = screen.getByLabelText("Tải lên ảnh đại diện") as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Định dạng tệp không hợp lệ",
        expect.objectContaining({
          description: "Chỉ chấp nhận ảnh định dạng JPEG, PNG hoặc WebP.",
        })
      );
      expect(mockUploadMutateAsync).not.toHaveBeenCalled();
    });
  });

  it("uploads valid image and cleans up object URL", async () => {
    mockUploadMutateAsync.mockResolvedValueOnce({
      userId: "u1",
      email: "test@test.com",
      role: "student",
      profile: { fullName: "Nguyen Van A", avatarUrl: "https://new-url.webp" },
      updatedAt: "2026-10-08",
    });

    render(<AvatarUpload fullName="Nguyen Van A" currentAvatarUrl={null} />);

    const validFile = new File(["valid image bytes"], "avatar.png", {
      type: "image/png",
    });

    const fileInput = screen.getByLabelText("Tải lên ảnh đại diện") as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(mockUploadMutateAsync).toHaveBeenCalledWith(validFile);
      expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    });
  });

  it("opens delete confirmation modal and invokes delete mutation on confirmation", async () => {
    const user = userEvent.setup();
    mockDeleteMutateAsync.mockResolvedValueOnce({
      userId: "u1",
      email: "test@test.com",
      role: "student",
      profile: { fullName: "Nguyen Van A", avatarUrl: null },
      updatedAt: "2026-10-08",
    });

    render(
      <AvatarUpload
        fullName="Nguyen Van A"
        currentAvatarUrl="https://storage.toeicpath.com/avatars/user-1.webp"
      />
    );

    const deleteBtn = screen.getByText("Xóa ảnh");
    await user.click(deleteBtn);

    expect(screen.getByText("Xóa ảnh đại diện?")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Ảnh đại diện của bạn sẽ bị gỡ bỏ và chuyển về chữ cái đầu mặc định. Bạn có thể tải lên ảnh mới bất kỳ lúc nào."
      )
    ).toBeInTheDocument();

    const confirmBtn = screen.getByRole("button", { name: "Xác nhận xóa" });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(mockDeleteMutateAsync).toHaveBeenCalled();
    });
  });
});
