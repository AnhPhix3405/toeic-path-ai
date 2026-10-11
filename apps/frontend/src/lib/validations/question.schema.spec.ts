import { describe, it, expect } from "vitest";
import { singleQuestionSchema } from "./question.schema";

describe("singleQuestionSchema", () => {
  const validPayload = {
    content: "Where will the meeting be held tomorrow morning?",
    explanation: "Conference room B is designated for large meetings.",
    partId: "11111111-1111-4111-a111-111111111111",
    difficulty: "medium" as const,
    topicIds: ["22222222-2222-4222-a222-222222222222"],
    skillIds: ["33333333-3333-4333-a333-333333333333"],
    options: [
      { content: "In room 302", position: 1, isCorrect: true },
      { content: "At 9:00 AM", position: 2, isCorrect: false },
      { content: "Yes, I did", position: 3, isCorrect: false },
      { content: "Mr. Henderson", position: 4, isCorrect: false },
    ],
  };

  it("passes validation with valid question and 4 options with exactly 1 correct answer", () => {
    const result = singleQuestionSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("fails when content is shorter than 3 characters", () => {
    const result = singleQuestionSchema.safeParse({
      ...validPayload,
      content: "Hi",
    });
    expect(result.success).toBe(false);
  });

  it("fails when partId is not a valid UUID", () => {
    const result = singleQuestionSchema.safeParse({
      ...validPayload,
      partId: "invalid-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("fails when no option is marked as correct (Single Choice invariant)", () => {
    const result = singleQuestionSchema.safeParse({
      ...validPayload,
      options: [
        { content: "A", position: 1, isCorrect: false },
        { content: "B", position: 2, isCorrect: false },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("fails when multiple options are marked as correct", () => {
    const result = singleQuestionSchema.safeParse({
      ...validPayload,
      options: [
        { content: "A", position: 1, isCorrect: true },
        { content: "B", position: 2, isCorrect: true },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("fails when an option has empty content", () => {
    const result = singleQuestionSchema.safeParse({
      ...validPayload,
      options: [
        { content: "A", position: 1, isCorrect: true },
        { content: "   ", position: 2, isCorrect: false },
      ],
    });
    expect(result.success).toBe(false);
  });
});
