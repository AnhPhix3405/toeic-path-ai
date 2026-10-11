import { describe, it, expect } from "vitest";
import { questionGroupSchema } from "./question-group.schema";

describe("questionGroupSchema", () => {
  it("passes validation with valid context and title", () => {
    const result = questionGroupSchema.safeParse({
      title: "Questions 151-153: Notice on Company Policy",
      context:
        "Attention all personnel. The maintenance team will shut down power in Sector B starting at 6:00 PM tonight.",
    });
    expect(result.success).toBe(true);
  });

  it("passes validation with empty title and valid context", () => {
    const result = questionGroupSchema.safeParse({
      title: "",
      context:
        "Dear Mr. Davis, Thank you for inquiring about our quarterly software release.",
    });
    expect(result.success).toBe(true);
  });

  it("fails validation when context is less than 10 characters", () => {
    const result = questionGroupSchema.safeParse({
      title: "Short",
      context: "Too short",
    });
    expect(result.success).toBe(false);
  });

  it("fails validation when title exceeds 255 characters", () => {
    const result = questionGroupSchema.safeParse({
      title: "a".repeat(256),
      context: "Valid length context of text exceeding ten characters.",
    });
    expect(result.success).toBe(false);
  });
});
