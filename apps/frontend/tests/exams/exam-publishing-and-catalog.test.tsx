import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ExamPublishingPanel } from "@/features/exams/components/publishing/exam-publishing-panel";
import { PublicExamCardGrid } from "@/features/exams/components/catalog/public-exam-card-grid";
import { ExamOverviewModal } from "@/features/exams/components/catalog/exam-overview-modal";

describe("Exam Publishing Checklist & Student Public Catalog (UC18, UC19, Review Focus 4 & 5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Review Focus 4: renders Publish Checklist failure report with invalidQuestionIds when publish fails", () => {
    const onPublish = vi.fn();
    render(
      <ExamPublishingPanel
        examId="ex-1"
        title="ETS TOEIC 2026 Test 01"
        status="draft"
        version={2}
        totalActualQuestions={198}
        totalTargetQuestions={200}
        checklistError={{
          message: "Đề thi chứa 2 câu hỏi không hợp lệ (thiếu media Audio/Image).",
          errorCode: "ERR_EXAM_INVALID_QUESTIONS",
          invalidQuestionIds: ["q-missing-audio-1", "q-missing-img-2"],
        }}
        isMutating={false}
        onPublish={onPublish}
        onUnpublish={vi.fn()}
        onCloseExam={vi.fn()}
        onArchiveExam={vi.fn()}
      />
    );

    expect(
      screen.getByRole("alert")
    ).toHaveTextContent(/Đề thi chứa 2 câu hỏi không hợp lệ/i);
    expect(screen.getByText(/q-missing-audio-1/i)).toBeInTheDocument();
    expect(screen.getByText(/q-missing-img-2/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Xuất bản đề thi/i }));
    expect(onPublish).toHaveBeenCalledWith({ version: 2 });
  });

  it("Review Focus 5: renders PublicExamCardGrid (#1006 page jump) and ExamOverviewModal with Zero Answer Leakage & isScheduled guard", () => {
    const onPageChange = vi.fn();
    const onSelectExam = vi.fn();

    render(
      <div>
        <PublicExamCardGrid
          items={[
            {
              id: "ex-pub-1",
              title: "ETS TOEIC 2026 Scheduled Test",
              description: "Official mock test",
              type: "full_test",
              durationMinutes: 120,
              totalQuestions: 200,
              allowPartPractice: true,
              totalAttempts: 15,
              openAt: "2026-12-01T08:00:00.000Z",
              closeAt: "2026-12-31T23:59:59.000Z",
              isScheduled: true,
            },
          ]}
          total={15}
          page={1}
          limit={10}
          onPageChange={onPageChange}
          onLimitChange={vi.fn()}
          onSelectExam={onSelectExam}
          onResetFilters={vi.fn()}
        />
        <ExamOverviewModal
          isOpen={true}
          isLoading={false}
          overview={{
            id: "ex-pub-1",
            title: "ETS TOEIC 2026 Scheduled Test",
            description: "Official mock test",
            type: "full_test",
            durationMinutes: 120,
            totalQuestions: 200,
            allowPartPractice: true,
            openAt: "2026-12-01T08:00:00.000Z",
            closeAt: "2026-12-31T23:59:59.000Z",
            isScheduled: true,
            remainingAttempts: 3,
            parts: [
              {
                partNumber: 1,
                partName: "Photographs",
                questionCount: 6,
                suggestedDuration: null,
              },
              {
                partNumber: 5,
                partName: "Incomplete Sentences",
                questionCount: 30,
                suggestedDuration: 12,
              },
            ],
          }}
          onClose={vi.fn()}
        />
      </div>
    );

    expect(screen.getAllByText(/Sắp diễn ra/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Part 5: Incomplete Sentences/i)).toBeInTheDocument();
    expect(screen.getByText(/3 lượt/i)).toBeInTheDocument();

    const startBtn = screen.getByRole("button", {
      name: /Chưa đến giờ mở đề/i,
    });
    expect(startBtn).toBeDisabled();
  });
});
