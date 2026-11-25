import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CodeBadge } from "@/components/common/code-badge";
import { ExamOverviewModal } from "@/features/exams/components/catalog/exam-overview-modal";
import { ExamForm } from "@/features/exams/components/manage/exam-form";
import { extractAnotherExamConflict } from "@/lib/validations/exam-attempt.schema";
import { ExamOverview } from "@/types/exam";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("SEO Slugs & Human-Readable Short Codes UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("CodeBadge renders short code and copies to clipboard on click", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    render(<CodeBadge code="Q-00042" label="Mã câu hỏi" />);
    const btn = screen.getByRole("button", { name: /Sao chép mã Q-00042/i });
    expect(btn).toBeTruthy();
    expect(screen.getByText("Q-00042")).toBeTruthy();

    fireEvent.click(btn);
    expect(writeText).toHaveBeenCalledWith("Q-00042");
  });

  it("ExamOverviewModal links to pretty slug instructions URL when slug is present", () => {
    const overview: ExamOverview = {
      id: "11111111-2222-4333-8444-555555555555",
      slug: "ets-toeic-2026-test-01",
      title: "ETS TOEIC 2026 Test 01",
      description: "Full mock exam",
      type: "full_test",
      durationMinutes: 120,
      totalQuestions: 200,
      allowPartPractice: true,
      openAt: null,
      closeAt: null,
      isScheduled: false,
      remainingAttempts: 3,
      parts: [
        {
          partNumber: 1,
          partName: "Part 1: Photographs",
          questionCount: 6,
          suggestedDuration: 10,
        },
      ],
    };

    render(
      <ExamOverviewModal
        overview={overview}
        isOpen={true}
        isLoading={false}
        onClose={vi.fn()}
      />
    );

    const ctaLink = screen.getByRole("link", {
      name: /Bắt đầu làm bài/i,
    });
    expect(ctaLink.getAttribute("href")).toBe(
      "/exams/ets-toeic-2026-test-01/instructions"
    );
  });

  it("extractAnotherExamConflict extracts attemptCode for anti-IDOR resume URL", () => {
    const conflict = extractAnotherExamConflict({
      statusCode: 409,
      errorCode: "ERR_ANOTHER_EXAM_IN_PROGRESS",
      attemptId: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
      attemptCode: "att_9xK2mP7qR4",
      examTitle: "ETS TOEIC 2026 Test 01",
      startedAt: "2026-11-24T00:00:00.000Z",
      remainingSeconds: 1800,
    });

    expect(conflict).not.toBeNull();
    expect(conflict?.attemptCode).toBe("att_9xK2mP7qR4");
    expect(conflict?.attemptId).toBe("aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee");
  });

  it("ExamForm displays inline serverTitleError under title input and clears on edit", () => {
    const onClear = vi.fn();
    render(
      <ExamForm
        mode="create"
        serverTitleError="Tiêu đề đề thi đã tồn tại. Vui lòng chọn tiêu đề khác."
        onClearServerTitleError={onClear}
        onSubmit={vi.fn()}
      />
    );

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Tiêu đề đề thi đã tồn tại");

    const titleInput = screen.getByLabelText(/Tiêu đề đề thi/i);
    fireEvent.change(titleInput, { target: { value: "ETS TOEIC 2026 Test 02" } });
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
