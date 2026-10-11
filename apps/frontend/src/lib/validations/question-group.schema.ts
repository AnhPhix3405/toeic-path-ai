import { z } from "zod";

export const questionGroupSchema = z.object({
  title: z
    .string()
    .trim()
    .max(255, "Tiêu đề không được vượt quá 255 ký tự")
    .optional(),
  context: z
    .string()
    .trim()
    .min(10, "Đoạn văn hoặc ngữ cảnh chung phải chứa ít nhất 10 ký tự"),
});

export type QuestionGroupFormValues = z.infer<typeof questionGroupSchema>;
