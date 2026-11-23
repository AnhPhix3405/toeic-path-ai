import { z } from "zod";
import {
  QuestionSnapshotData,
  SnapshotOptionItem,
} from "@/types/question-review";

export const reviewFeedbackSchema = z.object({
  feedback: z
    .string()
    .trim()
    .min(
      1,
      "Vui lòng nhập nhận xét chi tiết và hướng dẫn chỉnh sửa cho giáo viên."
    )
    .max(2000, "Nội dung nhận xét không được vượt quá 2.000 ký tự."),
  applyToWholeGroup: z.boolean().optional(),
});

export type ReviewFeedbackFormValues = z.infer<typeof reviewFeedbackSchema>;

export interface QuickFixValidationResult {
  isValid: boolean;
  contentError?: string;
  optionsError?: string;
  feedbackError?: string;
  optionItemErrors: Record<string, string>;
}

/**
 * Validates Quick-Fix & Approve payload strictly according to TOEIC Part 1-7 Matrix
 * (Rule #1002, #1009 & PMR 005 #4).
 */
export function validateQuickFixPayload(input: {
  partNumber?: number | null;
  content?: string | null;
  options: Array<{ id: string; content?: string | null; isCorrect: boolean }>;
  feedback?: string | null;
}): QuickFixValidationResult {
  const optionItemErrors: Record<string, string> = {};
  let contentError: string | undefined;
  let optionsError: string | undefined;
  let feedbackError: string | undefined;

  const partNum = input.partNumber ?? 5;
  const isQuestionContentRequired = ![1, 2, 6].includes(partNum);
  const isOptionContentRequired = ![1, 2].includes(partNum);

  if (
    isQuestionContentRequired &&
    (!input.content || input.content.trim() === "")
  ) {
    contentError = `Nội dung câu hỏi của Part ${partNum} bắt buộc phải có văn bản.`;
  }

  // Option count check for Part 1 (4 options) and Part 2 (3 options) (PMR 005 #4)
  if (partNum === 1 && input.options.length !== 4) {
    optionsError = "Part 1 bắt buộc phải có đúng 4 lựa chọn (A, B, C, D).";
  } else if (partNum === 2 && input.options.length !== 3) {
    optionsError = "Part 2 bắt buộc phải có đúng 3 lựa chọn (A, B, C).";
  }

  // Single Choice Invariant
  const correctCount = input.options.filter((o) => o.isCorrect === true).length;
  if (!optionsError && correctCount !== 1) {
    optionsError =
      "Câu hỏi trắc nghiệm bắt buộc phải có duy nhất 1 đáp án đúng.";
  }

  if (isOptionContentRequired) {
    for (const opt of input.options) {
      if (!opt.content || opt.content.trim() === "") {
        optionItemErrors[opt.id] = `Phương án trả lời của Part ${partNum} không được để trống.`;
      }
    }
  }

  if (input.feedback && input.feedback.trim().length > 2000) {
    feedbackError = "Nội dung ghi chú không được vượt quá 2.000 ký tự.";
  }

  const isValid =
    !contentError &&
    !optionsError &&
    !feedbackError &&
    Object.keys(optionItemErrors).length === 0;

  return {
    isValid,
    contentError,
    optionsError,
    feedbackError,
    optionItemErrors,
  };
}

export const IGNORED_DIFF_KEYS = new Set([
  "id",
  "questionId",
  "createdAt",
  "updatedAt",
  "createdBy",
  "version",
  "status",
  "media",
  "group",
]);

export interface SnapshotOptionDiff {
  id: string;
  label: string;
  beforeContent: string | null;
  afterContent: string | null;
  beforeCorrect: boolean;
  afterCorrect: boolean;
  contentChanged: boolean;
  correctChanged: boolean;
}

export interface SnapshotDiffSummary {
  isInitialCreation: boolean;
  hasBusinessChanges: boolean;
  contentChanged: boolean;
  beforeContent: string | null;
  afterContent: string | null;
  explanationChanged: boolean;
  beforeExplanation: string | null;
  afterExplanation: string | null;
  statusChanged: boolean;
  beforeStatus: string | null;
  afterStatus: string | null;
  optionDiffs: SnapshotOptionDiff[];
}

function normalizeStr(val: string | null | undefined): string {
  return (val ?? "").trim();
}

/**
 * Computes field-level and option-level diffs between snapshotBefore and snapshotAfter.
 * Matches options by id -> label -> position/index fallback (PMR 005 #5).
 */
export function computeQuestionSnapshotDiff(
  before: QuestionSnapshotData | null | undefined,
  after: QuestionSnapshotData
): SnapshotDiffSummary {
  const isInitialCreation = !before;

  const beforeContent = before?.content ?? null;
  const afterContent = after?.content ?? null;
  const contentChanged =
    !isInitialCreation &&
    normalizeStr(beforeContent) !== normalizeStr(afterContent);

  const beforeExplanation = before?.explanation ?? null;
  const afterExplanation = after?.explanation ?? null;
  const explanationChanged =
    !isInitialCreation &&
    normalizeStr(beforeExplanation) !== normalizeStr(afterExplanation);

  const beforeStatus = before?.status ?? null;
  const afterStatus = after?.status ?? null;
  const statusChanged =
    !isInitialCreation &&
    normalizeStr(beforeStatus) !== normalizeStr(afterStatus);

  const beforeOptions: SnapshotOptionItem[] = before?.options || [];
  const afterOptions: SnapshotOptionItem[] = after?.options || [];

  const optionDiffs: SnapshotOptionDiff[] = afterOptions.map(
    (afterOpt, idx) => {
      const label =
        afterOpt.label || String.fromCharCode(65 + (afterOpt.position ? afterOpt.position - 1 : idx));

      let matchedBefore: SnapshotOptionItem | undefined;
      if (afterOpt.id) {
        matchedBefore = beforeOptions.find((b) => b.id && b.id === afterOpt.id);
      }
      if (!matchedBefore && afterOpt.label) {
        matchedBefore = beforeOptions.find(
          (b) => b.label?.toUpperCase() === afterOpt.label?.toUpperCase()
        );
      }
      if (!matchedBefore && afterOpt.position !== undefined) {
        matchedBefore = beforeOptions.find(
          (b) => b.position === afterOpt.position
        );
      }
      if (!matchedBefore) {
        matchedBefore = beforeOptions[idx];
      }

      const bContent = matchedBefore?.content ?? null;
      const aContent = afterOpt.content ?? null;
      const bCorrect = Boolean(matchedBefore?.isCorrect);
      const aCorrect = Boolean(afterOpt.isCorrect);

      return {
        id: afterOpt.id || matchedBefore?.id || `opt-${idx}`,
        label,
        beforeContent: bContent,
        afterContent: aContent,
        beforeCorrect: bCorrect,
        afterCorrect: aCorrect,
        contentChanged:
          !isInitialCreation && normalizeStr(bContent) !== normalizeStr(aContent),
        correctChanged: !isInitialCreation && bCorrect !== aCorrect,
      };
    }
  );

  const hasOptionChanges = optionDiffs.some(
    (opt) => opt.contentChanged || opt.correctChanged
  );
  const hasBusinessChanges =
    isInitialCreation ||
    contentChanged ||
    explanationChanged ||
    hasOptionChanges;

  return {
    isInitialCreation,
    hasBusinessChanges,
    contentChanged,
    beforeContent,
    afterContent,
    explanationChanged,
    beforeExplanation,
    afterExplanation,
    statusChanged,
    beforeStatus,
    afterStatus,
    optionDiffs,
  };
}
