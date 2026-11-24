import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ExamInstructionsView } from "@/features/exam-attempts/components/instructions/exam-instructions-view";
import { ExamOverviewModal } from "@/features/exams/components/catalog/exam-overview-modal";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(""),
}));

describe("Pre-Exam Instructions, Part Practice Selector (#1009) & 409 Conflict Guard (UC20)", () => {
  const sampleOverview = {
    id: "30000000-0000-4000-8000-000000000001",
    title: "ETS TOEIC 2026 Test 01",
    description: "Official Mock Exam",
    type: "full_test" as const,
    durationMinutes: 120,
    totalQuestions: 200,
    allowPartPractice: true,
    isScheduled: false,
    openAt: null,
    closeAt: null,
    remainingAttempts: 2,
    parts: [
      {
        partNumber: 1,
        partName: "Photographs",
        questionCount: 6,
        suggestedDuration: 5,
      },
      {
        partNumber: 5,
        partName: "Incomplete Sentences",
        questionCount: 30,
        suggestedDuration: 18,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders inline role=alert (#1009) when submitting part_practice with 0 selected parts", async () => {
    const onStartAttempt = vi.fn();
    render(
      <ExamInstructionsView
        overview={sampleOverview}
        isStarting={false}
        isAbandoning={false}
        onStartAttempt={onStartAttempt}
        onAbandonAttempt={vi.fn()}
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Luyện tập từng Part/i })
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Bắt đầu luyện tập/i })
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /Vui lòng chọn ít nhất 1 Phần thi/i
    );
    expect(onStartAttempt).not.toHaveBeenCalled();
  });

  it("Review Focus 2: opens ActiveAttemptConflictDialog on 409 ERR_ANOTHER_EXAM_IN_PROGRESS and supports Abandon -> Retry", async () => {
    const onStartAttempt = vi
      .fn()
      .mockRejectedValueOnce({
        response: {
          status: 409,
          data: {
            errorCode: "ERR_ANOTHER_EXAM_IN_PROGRESS",
            message: "Bạn đang có một bài thi dở dang ở đề thi khác",
            attemptId: "att-existing-99",
            examTitle: "Mini Test Listening Part 1-2",
            startedAt: "2026-11-24T07:00:00.000Z",
            remainingSeconds: 900,
          },
        },
      })
      .mockResolvedValueOnce({
        attemptId: "att-new-100",
        isResumed: false,
      });
    const onAbandonAttempt = vi.fn().mockResolvedValueOnce({ success: true });

    render(
      <ExamInstructionsView
        overview={sampleOverview}
        isStarting={false}
        isAbandoning={false}
        onStartAttempt={onStartAttempt}
        onAbandonAttempt={onAbandonAttempt}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Bắt đầu làm bài/i }));

    expect(
      await screen.findByText(/Mini Test Listening Part 1-2/i)
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /Hủy bài cũ & Bắt đầu đề này/i })
    );

    await waitFor(() => {
      expect(onAbandonAttempt).toHaveBeenCalledWith("att-existing-99");
      expect(onStartAttempt).toHaveBeenCalledTimes(2);
      expect(pushMock).toHaveBeenCalledWith("/exam-attempts/att-new-100");
    });
  });

  it("Review Focus 2: keeps Part Practice entry enabled in ExamOverviewModal when remainingAttempts === 0 and allowPartPractice === true", () => {
    render(
      <ExamOverviewModal
        isOpen={true}
        overview={{
          ...sampleOverview,
          remainingAttempts: 0,
          allowPartPractice: true,
        }}
        onClose={vi.fn()}
      />
    );

    const practiceLink = screen.getByRole("link", {
      name: /Luyện từng Part/i,
    });
    expect(practiceLink).toHaveAttribute(
      "href",
      `/exams/${sampleOverview.id}/instructions?mode=part_practice`
    );
  });
});
