import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ExamSectionsConfigurator } from "@/features/exams/components/builder/exam-sections-configurator";
import { ExamQuestionPickerModal } from "@/features/exams/components/builder/exam-question-picker-modal";

describe("Exam Structure Builder UI (UC17, Approved Open Question 2, Review Focus 3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Review Focus 3: blocks invalid placement_test section configuration (< 20 questions or missing Listening/Reading) with inline alert (#1009)", () => {
    const onSaveSections = vi.fn();
    render(
      <ExamSectionsConfigurator
        examType="placement_test"
        version={1}
        initialSections={[
          {
            id: "s-5",
            examId: "ex-1",
            partId: "p-5",
            partNumber: 5,
            partName: "Incomplete Sentences",
            targetQuestionsCount: 15,
            targetDurationMinutes: 10,
          },
        ]}
        isSaving={false}
        onSave={onSaveSections}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Lưu cấu hình Part/i }));
    expect(
      screen.getByRole("alert")
    ).toHaveTextContent(/Placement Test phải có tổng số câu hỏi từ 20 đến 100 câu/i);
    expect(onSaveSections).not.toHaveBeenCalled();
  });

  it("Approved Open Question 2: switches ExamQuestionPickerModal between Single Question mode (Part 5 -> questionIds) and Question Group mode (Part 3 -> questionGroupIds)", async () => {
    const onConfirmAdd = vi.fn();

    const { rerender } = render(
      <ExamQuestionPickerModal
        isOpen={true}
        version={2}
        section={{
          id: "sec-p5",
          examId: "ex-1",
          partId: "part-5-id",
          partNumber: 5,
          partName: "Incomplete Sentences",
          targetQuestionsCount: 30,
          targetDurationMinutes: 12,
        }}
        existingQuestionIds={[]}
        availableSingleQuestions={[
          {
            id: "q-single-101",
            content: "Mr. Tanaka _____ the quarterly budget report.",
            status: "published",
            questionGroupId: null,
            difficulty: "medium",
          } as never,
        ]}
        availableQuestionGroups={[]}
        isSubmitting={false}
        onClose={vi.fn()}
        onConfirmAdd={onConfirmAdd}
      />
    );

    fireEvent.click(screen.getByTestId("pick-single-question-q-single-101"));
    fireEvent.click(screen.getByRole("button", { name: /Thêm vào đề thi/i }));

    expect(onConfirmAdd).toHaveBeenCalledWith({
      version: 2,
      sectionId: "sec-p5",
      questionIds: ["q-single-101"],
    });

    // Rerender for Part 3 (Group mode -> questionGroupIds)
    onConfirmAdd.mockClear();
    rerender(
      <ExamQuestionPickerModal
        isOpen={true}
        version={3}
        section={{
          id: "sec-p3",
          examId: "ex-1",
          partId: "part-3-id",
          partNumber: 3,
          partName: "Conversations",
          targetQuestionsCount: 39,
          targetDurationMinutes: null,
        }}
        existingQuestionIds={[]}
        availableSingleQuestions={[]}
        availableQuestionGroups={[
          {
            id: "grp-conv-1",
            title: "Conversation at Airport Gate",
            context: "Questions 32-34 refer to the following conversation.",
            questions: [
              {
                id: "q-32",
                content: "Where are the speakers?",
                status: "published",
                part: { id: "part-3-id", partNumber: 3 },
              },
              {
                id: "q-33",
                content: "What is the problem?",
                status: "published",
                part: { id: "part-3-id", partNumber: 3 },
              },
            ],
          } as never,
        ]}
        isSubmitting={false}
        onClose={vi.fn()}
        onConfirmAdd={onConfirmAdd}
      />
    );

    fireEvent.click(screen.getByTestId("pick-question-group-grp-conv-1"));
    fireEvent.click(screen.getByRole("button", { name: /Thêm vào đề thi/i }));

    expect(onConfirmAdd).toHaveBeenCalledWith({
      version: 3,
      sectionId: "sec-p3",
      questionGroupIds: ["grp-conv-1"],
    });
  });
});
