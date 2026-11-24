import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { QuestionHistoryDiffViewer } from "@/features/questions/components/reviews/question-history-diff-viewer";
import { QuestionReviewTimeline } from "@/features/questions/components/reviews/question-review-timeline";

describe("QuestionHistoryDiffViewer & QuestionReviewTimeline (UC15-A3 & A4)", () => {
  it("renders visual before/after diff for content, options, and correct answer changes", () => {
    render(
      <QuestionHistoryDiffViewer
        histories={[
          {
            id: "h-1",
            questionId: "q-1",
            changedBy: "rev-1",
            author: { id: "rev-1", fullName: "Reviewer Trần B" },
            changeType: "quick_fixed",
            comment: "Sửa lỗi chính tả đáp án B",
            createdAt: "2026-11-23T09:30:00.000Z",
            snapshotBefore: {
              content: "The contract was _____ yesterday.",
              explanation: "Old explanation",
              version: 1,
              status: "pending_review",
              options: [
                { id: "o1", label: "A", content: "sign", isCorrect: false },
                { id: "o2", label: "B", content: "signd", isCorrect: true },
              ],
            },
            snapshotAfter: {
              content: "The contract was _____ yesterday afternoon.",
              explanation: "Passive voice requires past participle.",
              version: 2,
              status: "published",
              options: [
                { id: "o1", label: "A", content: "sign", isCorrect: false },
                { id: "o2", label: "B", content: "signed", isCorrect: true },
              ],
            },
          },
        ]}
      />
    );

    expect(screen.getByText(/Reviewer sửa nhanh & duyệt/i)).toBeInTheDocument();
    expect(
      screen.getByText("The contract was _____ yesterday.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("The contract was _____ yesterday afternoon.")
    ).toBeInTheDocument();
    expect(screen.getByText("signd")).toBeInTheDocument();
    expect(screen.getByText("signed")).toBeInTheDocument();
  });

  it("renders review timeline with action badges, version, reviewer info, and feedback", () => {
    render(
      <QuestionReviewTimeline
        logs={[
          {
            id: "log-1",
            questionId: "q-1",
            reviewerId: "rev-1",
            reviewer: { id: "rev-1", fullName: "Lead Teacher Lê C" },
            action: "revision_requested",
            feedback:
              "Đáp án C bị trùng nghĩa với đáp án A, vui lòng đổi từ vựng khác.",
            version: 2,
            createdAt: "2026-11-23T09:00:00.000Z",
          },
        ]}
      />
    );

    expect(screen.getByText(/Yêu cầu chỉnh sửa/i)).toBeInTheDocument();
    expect(screen.getByText(/Lead Teacher Lê C/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /Đáp án C bị trùng nghĩa với đáp án A, vui lòng đổi từ vựng khác/i
      )
    ).toBeInTheDocument();
    expect(screen.getByText(/Phiên bản v2/i)).toBeInTheDocument();
  });

  it("renders clean empty states when histories or logs are empty (PMR 005 #6)", () => {
    render(
      <div>
        <QuestionHistoryDiffViewer histories={[]} />
        <QuestionReviewTimeline logs={[]} />
      </div>
    );

    expect(
      screen.getByText(/Chưa có lịch sử thay đổi phiên bản/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Câu hỏi chưa có lịch sử kiểm duyệt/i)
    ).toBeInTheDocument();
  });

  it("BUG-S4-UI-003: filters out system metadata changes (version, status) and hides unchanged options when no business fields changed", () => {
    render(
      <QuestionHistoryDiffViewer
        histories={[
          {
            id: "h-meta-only",
            questionId: "q-1",
            changedBy: "rev-1",
            author: { id: "rev-1", fullName: "Reviewer Trần B" },
            changeType: "status_changed",
            comment: null,
            createdAt: "2026-11-23T10:30:00.000Z",
            snapshotBefore: {
              content: "Same question text",
              explanation: "Same explanation",
              version: 1,
              status: "draft",
              options: [
                { id: "o1", label: "A", content: "Option A unchanged", isCorrect: true },
                { id: "o2", label: "B", content: "Option B unchanged", isCorrect: false },
              ],
            },
            snapshotAfter: {
              content: "Same question text",
              explanation: "Same explanation",
              version: 2,
              status: "pending_review",
              options: [
                { id: "o1", label: "A", content: "Option A unchanged", isCorrect: true },
                { id: "o2", label: "B", content: "Option B unchanged", isCorrect: false },
              ],
            },
          },
        ]}
      />
    );

    expect(
      screen.getByText(/Không có thay đổi về nội dung câu hỏi, phương án hoặc lời giải/i)
    ).toBeInTheDocument();
    expect(screen.queryByText("Option A unchanged")).not.toBeInTheDocument();
  });
});
