import { z } from "zod";

/**
 * Rule #1002 (be-rules.md):
 * - Part 1 & Part 2: Question.content and Option.content are optional (audio-only).
 * - Part 6: Question.content is optional (context lives in QuestionGroup), Option.content is required.
 * - Part 3, 4, 5, 7 (or unselected): Both Question.content (>= 3 chars) and Option.content (>= 1 char) are required.
 */
export function isQuestionContentOptionalForPart(
  partNumber?: number | null
): boolean {
  return partNumber === 1 || partNumber === 2 || partNumber === 6;
}

export function areOptionContentsOptionalForPart(
  partNumber?: number | null
): boolean {
  return partNumber === 1 || partNumber === 2;
}

export const questionOptionSchema = z.object({
  id: z.string().optional(),
  label: z.string().optional(),
  content: z.string().trim(),
  isCorrect: z.boolean(),
  position: z.number().int().min(1),
});

export function createSingleQuestionSchema(partNumber?: number | null) {
  const allowEmptyContent = isQuestionContentOptionalForPart(partNumber);
  const allowEmptyOptionContent = areOptionContentsOptionalForPart(partNumber);

  const optionSchema = questionOptionSchema.superRefine((opt, ctx) => {
    if (!allowEmptyOptionContent && opt.content.trim().length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["content"],
        message: "Nội dung đáp án không được để trống",
      });
    }
  });

  return z
    .object({
      content: z.string().trim(),
      explanation: z.string().trim().optional(),
      partId: z.string().uuid("Vui lòng chọn Part TOEIC hợp lệ"),
      difficulty: z.enum(["easy", "medium", "hard"], {
        message: "Vui lòng chọn mức độ khó",
      }),
      topicIds: z.array(z.string().uuid()),
      skillIds: z.array(z.string().uuid()),
      options: z
        .array(optionSchema)
        .min(2, "Cần ít nhất 2 phương án đáp án")
        .refine(
          (options) => options.filter((opt) => opt.isCorrect).length === 1,
          {
            message: "Phải chọn đúng 1 đáp án làm đáp án chính xác",
          }
        ),
    })
    .superRefine((data, ctx) => {
      if (!allowEmptyContent && data.content.trim().length < 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["content"],
          message: "Nội dung câu hỏi phải có ít nhất 3 ký tự",
        });
      }
    });
}

export const singleQuestionSchema = createSingleQuestionSchema(null);

export type SingleQuestionFormValues = z.infer<typeof singleQuestionSchema>;
export type QuestionOptionFormValue = z.infer<typeof questionOptionSchema>;
