import { z } from "zod";

export const createQuestionReportSchema = z
  .object({
    reason: z.enum(
      [
        "wrong_answer",
        "typo_error",
        "broken_media",
        "unclear_explanation",
        "other",
      ],
      { message: "Vui lòng chọn lý do báo cáo hợp lệ." }
    ),
    description: z
      .string()
      .trim()
      .max(1000, "Mô tả chi tiết không được vượt quá 1000 ký tự.")
      .optional(),
    attemptId: z.string().uuid("Mã lượt thi không hợp lệ.").optional(),
  })
  .superRefine((data, ctx) => {
    if (data.reason === "other") {
      if (!data.description || data.description.trim().length < 10) {
        ctx.addIssue({
          code: "custom",
          path: ["description"],
          message:
            "Vui lòng nhập mô tả chi tiết tối thiểu 10 ký tự khi chọn lý do Khác.",
        });
      }
    }
  });

export type CreateQuestionReportFormValues = z.infer<
  typeof createQuestionReportSchema
>;

export const resolveQuestionReportSchema = z
  .object({
    status: z.enum(["in_review", "resolved", "rejected"], {
      message: "Trạng thái xử lý chỉ chấp nhận in_review, resolved hoặc rejected.",
    }),
    resolutionNote: z
      .string()
      .trim()
      .max(1000, "Ghi chú phản hồi không được vượt quá 1000 ký tự.")
      .optional(),
    resolveAllForQuestion: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    const isTerminal =
      data.status === "resolved" || data.status === "rejected";
    if (isTerminal) {
      if (!data.resolutionNote || data.resolutionNote.trim().length < 10) {
        ctx.addIssue({
          code: "custom",
          path: ["resolutionNote"],
          message:
            "Ghi chú phản hồi phải có ít nhất 10 ký tự khi Đã xử lý hoặc Từ chối.",
        });
      }
    }
  });

export type ResolveQuestionReportFormValues = z.infer<
  typeof resolveQuestionReportSchema
>;
