import { z } from "zod";
import {
  AnotherExamInProgressErrorData,
  SaveAnswerDto,
} from "@/types/exam-attempt";

export const createExamAttemptSchema = z
  .object({
    examId: z.string().uuid("Mã đề thi không hợp lệ."),
    mode: z.enum(["full_exam", "part_practice"]).default("full_exam"),
    selectedParts: z
      .array(z.number().int().min(1).max(7))
      .optional(),
    deviceInfo: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.mode === "part_practice") {
      if (!data.selectedParts || data.selectedParts.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["selectedParts"],
          message:
            "Vui lòng chọn ít nhất 1 Phần thi (Part) để bắt đầu luyện tập.",
        });
      } else if (new Set(data.selectedParts).size !== data.selectedParts.length) {
        ctx.addIssue({
          code: "custom",
          path: ["selectedParts"],
          message: "Danh sách Phần thi không được trùng lặp.",
        });
      }
    }
  });

export type CreateExamAttemptFormValues = z.infer<typeof createExamAttemptSchema>;

/**
 * Clamps incremental delta timeSpentSeconds to [0, 7200] matching @Min(0) @Max(7200) on SaveAnswerDto.
 */
export function clampTimeSpentSeconds(seconds: number): number {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return 0;
  }
  return Math.min(7200, Math.floor(seconds));
}

export type ConditionalSaveAction =
  | { type: "SELECT_OPTION"; optionId: string }
  | { type: "CLEAR_OPTION" }
  | { type: "TOGGLE_REVIEW"; isMarkedForReview: boolean };

/**
 * Builds a SaveAnswerDto strictly preserving the 3 selectedOptionId semantics (PMR 019):
 * - SELECT_OPTION -> selectedOptionId: UUID
 * - CLEAR_OPTION  -> selectedOptionId: null
 * - TOGGLE_REVIEW -> selectedOptionId key omitted (undefined) so SQL Conditional Upsert preserves existing answer
 */
export function buildConditionalSavePayload(params: {
  questionId: string;
  action: ConditionalSaveAction;
  deltaTimeSpentSeconds: number;
}): SaveAnswerDto {
  const safeTimeSpent = clampTimeSpentSeconds(params.deltaTimeSpentSeconds);

  if (params.action.type === "TOGGLE_REVIEW") {
    return {
      questionId: params.questionId,
      isMarkedForReview: params.action.isMarkedForReview,
      timeSpentSeconds: safeTimeSpent,
    };
  }

  return {
    questionId: params.questionId,
    selectedOptionId:
      params.action.type === "SELECT_OPTION" ? params.action.optionId : null,
    timeSpentSeconds: safeTimeSpent,
  };
}

/**
 * Extracts structured 409 ERR_ANOTHER_EXAM_IN_PROGRESS metadata from Axios error response.
 */
export function extractAnotherExamConflict(
  error: unknown
): AnotherExamInProgressErrorData | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  const response = (
    error as {
      response?: {
        status?: number;
        data?: Record<string, unknown>;
      };
    }
  ).response;

  const rawData =
    response?.data && typeof response.data === "object"
      ? (response.data as Record<string, unknown>)
      : (error as Record<string, unknown>);

  // Handle both raw NestJS ConflictException body and wrapped { error: ... } / { data: ... }
  const payload =
    rawData.errorCode === "ERR_ANOTHER_EXAM_IN_PROGRESS"
      ? rawData
      : rawData.data &&
        typeof rawData.data === "object" &&
        (rawData.data as Record<string, unknown>).errorCode ===
          "ERR_ANOTHER_EXAM_IN_PROGRESS"
      ? (rawData.data as Record<string, unknown>)
      : null;

  if (!payload || typeof payload.attemptId !== "string") {
    return null;
  }

  return {
    errorCode: "ERR_ANOTHER_EXAM_IN_PROGRESS",
    message:
      typeof payload.message === "string"
        ? payload.message
        : "Bạn đang có một bài thi dở dang ở đề thi khác",
    attemptId: payload.attemptId,
    attemptCode:
      typeof payload.attemptCode === "string" ? payload.attemptCode : undefined,
    examTitle:
      typeof payload.examTitle === "string" ? payload.examTitle : "Đề thi khác",
    startedAt:
      typeof payload.startedAt === "string"
        ? payload.startedAt
        : new Date().toISOString(),
    remainingSeconds:
      typeof payload.remainingSeconds === "number"
        ? payload.remainingSeconds
        : 0,
  };
}

/**
 * Extracts errorCode and message from an Axios/API error for terminal vs retryable classification (PMR 025 #3).
 */
export function extractApiErrorMeta(error: unknown): {
  status: number | null;
  errorCode: string | null;
  message: string;
  isNetworkError: boolean;
} {
  if (!error || typeof error !== "object") {
    return {
      status: null,
      errorCode: null,
      message: "Đã xảy ra lỗi không xác định.",
      isNetworkError: false,
    };
  }

  const errObj = error as {
    code?: string;
    errorCode?: string;
    statusCode?: number;
    message?: string;
    response?: {
      status?: number;
      data?: Record<string, unknown>;
    };
  };

  const status = errObj.response?.status ?? errObj.statusCode ?? null;
  const data = errObj.response?.data;
  const errorCode =
    (data && typeof data.errorCode === "string" ? data.errorCode : null) ??
    (typeof errObj.errorCode === "string" ? errObj.errorCode : null);

  let message = errObj.message || "Đã xảy ra lỗi không xác định.";
  if (data) {
    if (typeof data.message === "string") {
      message = data.message;
    } else if (Array.isArray(data.message) && data.message.length > 0) {
      message = String(data.message[0]);
    }
  }

  const isNetworkError =
    status === null ||
    status === 0 ||
    errObj.code === "ERR_NETWORK" ||
    errObj.errorCode === "ERR_NETWORK" ||
    errObj.code === "ECONNABORTED" ||
    errObj.errorCode === "ECONNABORTED" ||
    message.toLowerCase().includes("network error");

  return { status, errorCode, message, isNetworkError };
}

/**
 * Deterministic duration estimate for Part Practice matching Backend PMR 017:
 * - Prefer suggestedDuration (minutes) if available
 * - Else 45s/question for Listening (Part 1-4) and 36s/question for Reading (Part 5-7), rounded up to whole minutes.
 */
export function estimatePartPracticeMinutes(
  parts: Array<{
    partNumber: number;
    questionCount: number;
    suggestedDuration?: number | null;
  }>,
  selectedParts: number[]
): number {
  const selectedSet = new Set(selectedParts);
  let totalSeconds = 0;

  for (const part of parts) {
    if (!selectedSet.has(part.partNumber)) continue;
    if (part.suggestedDuration && part.suggestedDuration > 0) {
      totalSeconds += part.suggestedDuration * 60;
    } else {
      const perQuestion = part.partNumber <= 4 ? 45 : 36;
      totalSeconds += part.questionCount * perQuestion;
    }
  }

  return Math.ceil(totalSeconds / 60);
}

export const attemptHistoryFilterSchema = z
  .object({
    fromDate: z.string().optional(),
    toDate: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.fromDate && data.toDate && data.fromDate > data.toDate) {
      ctx.addIssue({
        code: "custom",
        path: ["toDate"],
        message: "Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.",
      });
    }
  });

export function formatDurationSpent(seconds?: number | null): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) {
    return "—";
  }
  const safe = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hrs > 0) {
    return `${hrs} giờ ${mins} phút ${secs} giây`;
  }
  if (mins > 0) {
    return `${mins} phút ${secs} giây`;
  }
  return `${secs} giây`;
}
