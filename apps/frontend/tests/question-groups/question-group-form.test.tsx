import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { QuestionGroupForm } from "@/features/question-groups/components/question-group-form";
import * as groupHooks from "@/hooks/use-question-groups";

vi.mock("@/hooks/use-question-groups");
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
}));

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("QuestionGroupForm Component", () => {
  const mockCreateMutateAsync = vi.fn();
  const mockUpdateMutateAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(groupHooks.useCreateQuestionGroup).mockReturnValue({
      mutateAsync: mockCreateMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof groupHooks.useCreateQuestionGroup>);

    vi.mocked(groupHooks.useUpdateQuestionGroup).mockReturnValue({
      mutateAsync: mockUpdateMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof groupHooks.useUpdateQuestionGroup>);
  });

  it("renders form inputs and passage preview component", () => {
    renderWithQuery(<QuestionGroupForm mode="create" />);

    expect(screen.getByPlaceholderText(/Ví dụ: Questions 153-155/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/Dán hoặc soạn thảo bài đọc/i)).toBeDefined();
    expect(screen.getByText("Xem trước bài đọc")).toBeDefined();
    expect(screen.getByText("Tạo nhóm câu hỏi")).toBeDefined();
  });

  it("validates context minimum length on empty submit", async () => {
    renderWithQuery(<QuestionGroupForm mode="create" />);

    const submitBtn = screen.getByText("Tạo nhóm câu hỏi");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Đoạn văn hoặc ngữ cảnh chung phải chứa ít nhất 10 ký tự")
      ).toBeDefined();
    });
  });

  it("submits valid question group data successfully", async () => {
    mockCreateMutateAsync.mockResolvedValueOnce({ id: "group-1" });

    renderWithQuery(<QuestionGroupForm mode="create" />);

    const contextInput = screen.getByPlaceholderText(/Dán hoặc soạn thảo bài đọc/i);
    fireEvent.change(contextInput, {
      target: {
        value: "This is a detailed memo regarding corporate policy for all staff members.",
      },
    });

    const submitBtn = screen.getByText("Tạo nhóm câu hỏi");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockCreateMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "This is a detailed memo regarding corporate policy for all staff members.",
        })
      );
    });
  });
});
