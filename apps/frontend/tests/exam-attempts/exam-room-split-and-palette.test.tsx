import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { ExamRoomWorkspace } from "@/features/exam-attempts/components/room/exam-room-workspace";
import { useExamRoomStore } from "@/stores/exam-room.store";

describe("TOEIC Split-Screen Exam Room, Nullable Content (#1002), Keyboard Guard & Palette (UC21)", () => {
  beforeEach(() => {
    localStorage.clear();
    useExamRoomStore.getState().resetAll();
  });

  const overview = {
    id: "att-21",
    examId: "ex-1",
    examTitle: "Part 1 & Part 6 Practice",
    status: "in_progress" as const,
    mode: "part_practice" as const,
    selectedParts: [1, 6],
    startedAt: "2026-11-24T08:00:00.000Z",
    expiresAt: "2099-11-24T08:30:00.000Z",
    remainingSeconds: 1800,
    serverTimeNow: "2026-11-24T08:00:00.000Z",
    isExpired: false,
    totalQuestions: 2,
    answeredCount: 1,
    markedForReviewCount: 0,
    questionsProgress: [],
  };

  const delivery = {
    attemptId: "att-21",
    partNumber: null,
    totalQuestionsInPart: 2,
    questionGroups: [
      {
        id: "grp-p6",
        passageText:
          "To: All Staff — Notice regarding office renovation [131] ------- next Monday.",
        audioUrl: null,
        imageUrl: null,
      },
    ],
    questions: [
      {
        id: "q-p1",
        partNumber: 1,
        orderIndex: 1,
        originalQuestionNumber: 1,
        questionGroupId: null,
        content: null,
        audioUrl: "https://cdn.example.com/p1.mp3",
        imageUrl: "https://cdn.example.com/p1.png",
        options: [
          { id: "o-a", label: "A", content: null },
          { id: "o-b", label: "B", content: null },
          { id: "o-c", label: "C", content: null },
          { id: "o-d", label: "D", content: null },
        ],
        selectedOptionId: "o-b",
        isMarkedForReview: false,
      },
      {
        id: "q-p6",
        partNumber: 6,
        orderIndex: 2,
        originalQuestionNumber: 131,
        questionGroupId: "grp-p6",
        content: null,
        audioUrl: null,
        imageUrl: null,
        options: [
          { id: "o-6a", label: "A", content: "begins" },
          { id: "o-6b", label: "B", content: "begun" },
          { id: "o-6c", label: "C", content: "beginning" },
          { id: "o-6d", label: "D", content: "to begin" },
        ],
        selectedOptionId: null,
        isMarkedForReview: false,
      },
    ],
  };

  it("Review Focus 3: renders null question/option content safely (Part 1/2/6), deduplicates group passage in Split-Screen, and restricts Part tabs to attempt parts", () => {
    render(<ExamRoomWorkspace overview={overview} delivery={delivery} />);

    // Only Part 1 and Part 6 tabs exist (never Part 5 -> prevents 400 ERR_PART_NOT_IN_ATTEMPT)
    expect(screen.getByRole("tab", { name: /Part 1/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Part 6/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("tab", { name: /Part 5/i })
    ).not.toBeInTheDocument();

    // Null content never renders literal "null"
    expect(screen.queryByText("null")).not.toBeInTheDocument();

    // Jump to Question 2 via Question Palette button and verify Split-Screen passage appears
    fireEvent.click(screen.getByRole("button", { name: /Câu hỏi 2/i }));
    expect(
      screen.getByText(/Notice regarding office renovation/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/#131/i)).toBeInTheDocument();
  });

  it("PMR 025 #4: ignores global 1..4 / A..D keyboard shortcuts while typing inside the 'Đi tới câu' spinbutton", () => {
    render(<ExamRoomWorkspace overview={overview} delivery={delivery} />);

    const jumpSpinbutton = screen.getByRole("spinbutton", {
      name: /Nhập số câu hỏi cần xem/i,
    });
    jumpSpinbutton.focus();

    // Typing "1" inside the input must NOT change Question 1's selectedOptionId from "o-b" to "o-a"
    fireEvent.keyDown(jumpSpinbutton, { key: "1" });
    expect(
      useExamRoomStore.getState().sessions["att-21"]?.answers["q-p1"]
        ?.selectedOptionId
    ).toBe("o-b");
  });
});
