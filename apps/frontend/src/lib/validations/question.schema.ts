import { z } from "zod";

export const questionOptionSchema = z.object({
  id: z.string().optional(),
  label: z.string().optional(),
  content: z.string().trim().min(1, "Nội dung đáp án không được để trống"),
  isCorrect: z.boolean(),
  position: z.number().int().min(1),
});

export const singleQuestionSchema = z
  .object({
    content: z
      .string()
      .trim()
      .min(3, "Nội dung câu hỏi phải có ít nhất 3 ký tự"),
    explanation: z.string().trim().optional(),
    partId: z.string().uuid("Vui lòng chọn Part TOEIC hợp lệ"),
    difficulty: z.enum(["easy", "medium", "hard"], {
      message: "Vui lòng chọn mức độ khó",
    }),
    topicIds: z.array(z.string().uuid()),
    skillIds: z.array(z.string().uuid()),
    options: z
      .array(questionOptionSchema)
      .min(2, "Cần ít nhất 2 phương án đáp án")
      .refine(
        (options) => options.filter((opt) => opt.isCorrect).length === 1,
        {
          message: "Phải chọn đúng 1 đáp án làm đáp án chính xác",
        }
      ),
  });

export type SingleQuestionFormValues = z.infer<typeof singleQuestionSchema>;
export type QuestionOptionFormValue = z.infer<typeof questionOptionSchema>;
