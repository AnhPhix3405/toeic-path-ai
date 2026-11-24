import { z } from "zod";
import {
  CreateExamDto,
  ExamDetail,
  ExamQuestionItem,
  ExamType,
  ReorderItemInput,
  ScoreConversionType,
  SectionItemInput,
  UpdateExamDto,
} from "@/types/exam";

export const FULL_TEST_STANDARD_SECTIONS: Array<{
  partNumber: number;
  partName: string;
  targetQuestionsCount: number;
  targetDurationMinutes: number | null;
}> = [
  {
    partNumber: 1,
    partName: "Photographs",
    targetQuestionsCount: 6,
    targetDurationMinutes: null,
  },
  {
    partNumber: 2,
    partName: "Question-Response",
    targetQuestionsCount: 25,
    targetDurationMinutes: null,
  },
  {
    partNumber: 3,
    partName: "Conversations",
    targetQuestionsCount: 39,
    targetDurationMinutes: null,
  },
  {
    partNumber: 4,
    partName: "Talks",
    targetQuestionsCount: 30,
    targetDurationMinutes: null,
  },
  {
    partNumber: 5,
    partName: "Incomplete Sentences",
    targetQuestionsCount: 30,
    targetDurationMinutes: 12,
  },
  {
    partNumber: 6,
    partName: "Text Completion",
    targetQuestionsCount: 16,
    targetDurationMinutes: 8,
  },
  {
    partNumber: 7,
    partName: "Reading Comprehension",
    targetQuestionsCount: 54,
    targetDurationMinutes: 55,
  },
];

export const examFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(5, "Tiêu đề đề thi phải có từ 5 đến 255 ký tự.")
      .max(255, "Tiêu đề đề thi phải có từ 5 đến 255 ký tự."),
    description: z.string().optional(),
    type: z.enum(["full_test", "mini_test", "placement_test"]),
    durationMinutes: z.coerce
      .number()
      .int("Thời lượng làm bài phải là số nguyên (1 - 300 phút).")
      .min(1, "Thời lượng làm bài phải nằm trong khoảng từ 1 đến 300 phút.")
      .max(300, "Thời lượng làm bài phải nằm trong khoảng từ 1 đến 300 phút."),
    maxAttempts: z
      .union([z.coerce.number().int().min(1), z.literal(""), z.null()])
      .optional(),
    passingScore: z
      .union([
        z.coerce
          .number()
          .int()
          .min(0, "Điểm sàn chuẩn đạt phải từ 0 đến 990 điểm.")
          .max(990, "Điểm sàn chuẩn đạt phải từ 0 đến 990 điểm."),
        z.literal(""),
        z.null(),
      ])
      .optional(),
    openAt: z.string().optional(),
    closeAt: z.string().optional(),
    allowPartPractice: z.boolean().default(true),
    isShuffledQuestions: z.boolean().default(false),
    isShuffledOptions: z.boolean().default(false),
    scoreConversionType: z
      .enum(["DEFAULT_ETS", "CUSTOM", "RAW_PERCENTAGE"])
      .default("DEFAULT_ETS"),
  })
  .superRefine((val, ctx) => {
    if (val.openAt && val.closeAt) {
      const openTime = new Date(val.openAt).getTime();
      const closeTime = new Date(val.closeAt).getTime();
      if (
        !Number.isNaN(openTime) &&
        !Number.isNaN(closeTime) &&
        closeTime <= openTime
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["closeAt"],
          message: "Thời điểm đóng thi phải lớn hơn thời điểm mở thi.",
        });
      }
    }
  });

export type ExamFormValues = {
  title: string;
  description?: string;
  type: ExamType;
  durationMinutes: number;
  maxAttempts?: number | "" | null;
  passingScore?: number | "" | null;
  openAt?: string;
  closeAt?: string;
  allowPartPractice: boolean;
  isShuffledQuestions: boolean;
  isShuffledOptions: boolean;
  scoreConversionType: ScoreConversionType;
};

export function buildCreateExamPayload(values: ExamFormValues): CreateExamDto {
  const dto: CreateExamDto = {
    title: values.title.trim(),
    type: values.type,
    durationMinutes: Number(values.durationMinutes),
    allowPartPractice: Boolean(values.allowPartPractice),
    isShuffledQuestions: Boolean(values.isShuffledQuestions),
    isShuffledOptions: Boolean(values.isShuffledOptions),
    scoreConversionType: values.scoreConversionType || "DEFAULT_ETS",
  };

  if (values.description && values.description.trim()) {
    dto.description = values.description.trim();
  }
  if (
    values.maxAttempts !== undefined &&
    values.maxAttempts !== null &&
    values.maxAttempts !== "" &&
    Number(values.maxAttempts) >= 1
  ) {
    dto.maxAttempts = Number(values.maxAttempts);
  }
  if (
    values.passingScore !== undefined &&
    values.passingScore !== null &&
    values.passingScore !== "" &&
    Number(values.passingScore) >= 0
  ) {
    dto.passingScore = Number(values.passingScore);
  }
  if (values.openAt && values.openAt.trim()) {
    dto.openAt = new Date(values.openAt).toISOString();
  }
  if (values.closeAt && values.closeAt.trim()) {
    dto.closeAt = new Date(values.closeAt).toISOString();
  }

  return dto;
}

/**
 * Builds UpdateExamDto and strips locked technical fields when exam.status === "closed"
 * to prevent 400 ERR_EXAM_LOCKED_FIELDS (Review Focus 1 & BR16.7).
 */
export function buildUpdateExamPayload(
  exam: Pick<ExamDetail, "status" | "version">,
  values: ExamFormValues
): UpdateExamDto {
  const dto: UpdateExamDto = {
    title: values.title.trim(),
    description: values.description?.trim() || undefined,
    version: exam.version,
  };

  if (values.openAt && values.openAt.trim()) {
    dto.openAt = new Date(values.openAt).toISOString();
  }
  if (values.closeAt && values.closeAt.trim()) {
    dto.closeAt = new Date(values.closeAt).toISOString();
  }

  if (exam.status !== "closed") {
    dto.type = values.type;
    dto.durationMinutes = Number(values.durationMinutes);
    dto.allowPartPractice = Boolean(values.allowPartPractice);
    dto.isShuffledQuestions = Boolean(values.isShuffledQuestions);
    dto.isShuffledOptions = Boolean(values.isShuffledOptions);
    dto.scoreConversionType = values.scoreConversionType || "DEFAULT_ETS";

    if (
      values.maxAttempts !== undefined &&
      values.maxAttempts !== null &&
      values.maxAttempts !== "" &&
      Number(values.maxAttempts) >= 1
    ) {
      dto.maxAttempts = Number(values.maxAttempts);
    }
    if (
      values.passingScore !== undefined &&
      values.passingScore !== null &&
      values.passingScore !== "" &&
      Number(values.passingScore) >= 0
    ) {
      dto.passingScore = Number(values.passingScore);
    }
  }

  return dto;
}

export interface ConfigureSectionsValidationResult {
  isValid: boolean;
  error?: string;
  sectionErrors: Record<number, string>;
}

/**
 * Validates ConfigureExamSectionsDto payload for mini_test and placement_test
 * (Review Focus 3 & UC17).
 */
export function validateConfigureSectionsPayload(
  examType: ExamType,
  sections: SectionItemInput[]
): ConfigureSectionsValidationResult {
  const sectionErrors: Record<number, string> = {};
  let error: string | undefined;

  if (examType === "full_test") {
    return {
      isValid: false,
      error:
        "Đề thi Full Test tuân thủ cố định 7 Part chuẩn TOEIC (200 câu), không thể tùy chỉnh cấu hình sections.",
      sectionErrors,
    };
  }

  if (!sections || sections.length === 0) {
    return {
      isValid: false,
      error: "Vui lòng chọn ít nhất 1 Part TOEIC cho cấu trúc đề thi.",
      sectionErrors,
    };
  }

  for (const sec of sections) {
    if (
      !Number.isInteger(sec.targetQuestionsCount) ||
      sec.targetQuestionsCount < 1
    ) {
      sectionErrors[sec.partNumber] = `Chỉ tiêu số câu của Part ${sec.partNumber} phải từ 1 câu trở lên.`;
    }
    if (
      sec.targetDurationMinutes !== undefined &&
      sec.targetDurationMinutes !== null &&
      (!Number.isInteger(sec.targetDurationMinutes) ||
        sec.targetDurationMinutes < 1)
    ) {
      sectionErrors[sec.partNumber] = `Thời lượng gợi ý của Part ${sec.partNumber} phải từ 1 phút trở lên.`;
    }
  }

  if (examType === "placement_test") {
    const totalQuestions = sections.reduce(
      (sum, s) => sum + (Number(s.targetQuestionsCount) || 0),
      0
    );
    const hasListening = sections.some(
      (s) => s.partNumber >= 1 && s.partNumber <= 4
    );
    const hasReading = sections.some(
      (s) => s.partNumber >= 5 && s.partNumber <= 7
    );

    if (totalQuestions < 20 || totalQuestions > 100) {
      error = `Cấu hình Placement Test phải có tổng số câu hỏi từ 20 đến 100 câu (hiện tại: ${totalQuestions} câu).`;
    } else if (!hasListening || !hasReading) {
      error =
        "Placement Test bắt buộc phải bao gồm cả phần Listening (Part 1–4) và Reading (Part 5–7).";
    }
  }

  const isValid = !error && Object.keys(sectionErrors).length === 0;
  return {
    isValid,
    error,
    sectionErrors,
  };
}

/**
 * Moves a single question or an entire questionGroupId block up/down contiguously
 * and re-assigns sequential orderIndex 1..N (Review Focus 3 & BR17.5).
 */
export function buildContiguousReorderPayload(
  questions: ExamQuestionItem[],
  movingIndex: number,
  direction: "up" | "down"
): ReorderItemInput[] {
  const sorted = [...questions].sort((a, b) => a.orderIndex - b.orderIndex);
  if (movingIndex < 0 || movingIndex >= sorted.length) {
    return sorted.map((q, idx) => ({
      questionId: q.questionId,
      orderIndex: idx + 1,
    }));
  }

  // Group contiguous items sharing the same non-null questionGroupId into blocks
  const blocks: ExamQuestionItem[][] = [];
  let targetBlockIdx = -1;

  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i];
    const prevBlock = blocks[blocks.length - 1];
    if (
      item.questionGroupId &&
      prevBlock &&
      prevBlock[0].questionGroupId === item.questionGroupId
    ) {
      prevBlock.push(item);
    } else {
      blocks.push([item]);
    }
    if (i === movingIndex) {
      targetBlockIdx = blocks.length - 1;
    }
  }

  const swapBlockIdx =
    direction === "up" ? targetBlockIdx - 1 : targetBlockIdx + 1;
  if (
    targetBlockIdx >= 0 &&
    swapBlockIdx >= 0 &&
    swapBlockIdx < blocks.length
  ) {
    // Only swap within the same section if sections differ? Backend allows reorder across or within section as long as group integrity holds; keep within section if same section
    const temp = blocks[targetBlockIdx];
    blocks[targetBlockIdx] = blocks[swapBlockIdx];
    blocks[swapBlockIdx] = temp;
  }

  const flattened = blocks.flat();
  return flattened.map((q, idx) => ({
    questionId: q.questionId,
    orderIndex: idx + 1,
  }));
}
