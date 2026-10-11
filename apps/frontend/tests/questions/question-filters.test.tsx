import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { QuestionFilters } from "@/features/questions/components/question-filters";
import * as classificationHooks from "@/hooks/use-classification";
import { useQuestionFilterStore } from "@/stores/question-filter.store";

vi.mock("@/hooks/use-classification");

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("QuestionFilters Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useQuestionFilterStore.getState().resetFilters();

    vi.mocked(classificationHooks.useToeicParts).mockReturnValue({
      data: [
        { id: "p-1", partNumber: 1, name: "Photographs", description: null },
        { id: "p-5", partNumber: 5, name: "Incomplete Sentences", description: null },
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof classificationHooks.useToeicParts>);
  });

  it("renders search input, part select and create button", () => {
    renderWithQuery(<QuestionFilters />);

    expect(screen.getByPlaceholderText("Tìm kiếm nội dung câu hỏi...")).toBeDefined();
    expect(screen.getByText("Tạo câu hỏi")).toBeDefined();
    expect(screen.getByText("Tất cả Part (1–7)")).toBeDefined();
    expect(screen.getByText("Tất cả độ khó")).toBeDefined();
    expect(screen.getByText("Tất cả trạng thái")).toBeDefined();
  });

  it("updates search in store after typing with debounce", async () => {
    renderWithQuery(<QuestionFilters />);

    const searchInput = screen.getByPlaceholderText("Tìm kiếm nội dung câu hỏi...");
    fireEvent.change(searchInput, { target: { value: "meeting agenda" } });

    await waitFor(
      () => {
        expect(useQuestionFilterStore.getState().search).toBe("meeting agenda");
      },
      { timeout: 1000 }
    );
  });

  it("shows reset button when filter is active and resets when clicked", async () => {
    useQuestionFilterStore.getState().setDifficulty("hard");

    renderWithQuery(<QuestionFilters />);

    const resetBtn = screen.getByText("Đặt lại bộ lọc");
    expect(resetBtn).toBeDefined();

    fireEvent.click(resetBtn);
    expect(useQuestionFilterStore.getState().difficulty).toBeNull();
  });
});
